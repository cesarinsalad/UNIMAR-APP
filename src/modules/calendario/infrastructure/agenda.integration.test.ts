import 'dotenv/config';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { Pool, type PoolClient } from 'pg';
import type { DbTx } from '../../../shared/kernel/db';
import { PostgresEventoRepository } from './postgresEventoRepository';

/**
 * Integración de la consulta SQL del listado de agenda:
 *  - `incluirOficiales='agregados'`: solo PERSONAL + OFICIALES con fila en
 *    `evento_participantes` + INSTITUCIONAL.
 *  - Decoración `participo` del listado y de `buscarPorId` vía use case
 *    (aquí directo al repo).
 * Corre corriendo el repo real con RLS activa bajo claims simulados
 * (mismo patrón transaccional del test RLS: ROLLBACK al final).
 */
const RUN_DB_TESTS = process.env.RUN_DB_TESTS === '1';
const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://app_bff:app_bff_dev_password@localhost:54322/postgres';

describe.skipIf(!RUN_DB_TESTS)('Repo Calendario: listar agenda', () => {
  let pool: Pool;
  const repo = new PostgresEventoRepository();

  beforeAll(() => {
    pool = new Pool({ connectionString: DATABASE_URL });
  });

  afterAll(async () => {
    await pool.end();
  });

  async function withTx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      return await fn(client);
    } finally {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* conexión rota */
      }
      client.release();
    }
  }

  function claimsFor(userId: string, role: string, decanatoId: number | null): string {
    return JSON.stringify({ sub: userId, role, decanato_id: decanatoId, nombre: 'T' });
  }

  async function setClaims(c: PoolClient, json: string): Promise<void> {
    await c.query('SELECT set_config($1, $2, true)', ['request.jwt.claims', json]);
  }

  async function seedUsuarios(c: PoolClient): Promise<{ est5: string; com5: string; admin: string }> {
    const ts = Date.now();
    const est5 = await c.query<{ id: string }>(
      "INSERT INTO usuarios (cedula, nombre, email, rol_id, decanato_id) VALUES ($1, 'EST5', $2, (SELECT id FROM roles WHERE nombre='ESTUDIANTE'), 5) RETURNING id",
      [`AG-${ts}-E5`, `ag-est5-${ts}@test.ve`],
    );
    const com5 = await c.query<{ id: string }>(
      "INSERT INTO usuarios (cedula, nombre, email, rol_id, decanato_id) VALUES ($1, 'COM5', $2, (SELECT id FROM roles WHERE nombre='COMUNICADOR'), 5) RETURNING id",
      [`AG-${ts}-C5`, `ag-com5-${ts}@test.ve`],
    );
    const admin = await c.query<{ id: string }>(
      "INSERT INTO usuarios (cedula, nombre, email, rol_id) VALUES ($1, 'Admin', $2, (SELECT id FROM roles WHERE nombre='ADMIN')) RETURNING id",
      [`AG-${ts}-A`, `ag-admin-${ts}@test.ve`],
    );
    return { est5: est5.rows[0]!.id, com5: com5.rows[0]!.id, admin: admin.rows[0]!.id };
  }

  it("'agregados' devuelve personal+institucional sin participar; tras participar incluye el oficial con participo=true", async () => {
    await withTx(async (c) => {
      const tx = c as unknown as DbTx;
      const u = await seedUsuarios(c);
      const desdeHora = new Date(Date.now() - 60_000);
      const hastaHora = new Date(Date.now() + 5 * 60 * 60 * 1000);

      // PERSONAL propio
      await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5));
      const personal = await c.query<{ id: string }>(
        "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('Mi clase', 'PERSONAL', $1, now() + interval '1 hour') RETURNING id",
        [u.est5],
      );
      // OFICIAL global (comunicador)
      await setClaims(c, claimsFor(u.com5, 'COMUNICADOR', 5));
      const oficial = await c.query<{ id: string }>(
        "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('Foro abierto', 'OFICIAL', $1, now() + interval '2 hour') RETURNING id",
        [u.com5],
      );
      // INSTITUCIONAL (admin)
      await setClaims(c, claimsFor(u.admin, 'ADMIN', null));
      const institucional = await c.query<{ id: string }>(
        "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('Inscripciones', 'INSTITUCIONAL', $1, now() + interval '3 hour') RETURNING id",
        [u.admin],
      );
      const personalId = personal.rows[0]!.id;
      const oficialId = oficial.rows[0]!.id;
      const institucionalId = institucional.rows[0]!.id;

      const filtroBase = {
        desde: desdeHora,
        hasta: hastaHora,
        limit: 50,
        offset: 0,
        usuarioId: u.est5,
      };

      // ── Antes de participar: 'agregados' solo trae personal + institucional.
      await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5));
      const antes = await repo.listar(tx, { ...filtroBase, incluirOficiales: 'agregados' });
      const idsAgendaAntes = antes.map((e) => e.id);
      expect(idsAgendaAntes).toContain(personalId);
      expect(idsAgendaAntes).toContain(institucionalId);
      expect(idsAgendaAntes).not.toContain(oficialId);

      // 'todos' sí trae el oficial (aún sin participar), con participo=false.
      const todos = await repo.listar(tx, { ...filtroBase, incluirOficiales: 'todos' });
      const enTodos = todos.find((e) => e.id === oficialId);
      expect(enTodos).toBeDefined();
      expect(enTodos?.participo).toBe(false);

      // ── Participar: 'agregados' ahora incluye el oficial y lo marca.
      await repo.participar(tx, oficialId, u.est5);
      // Idempotente: re-agregar no revienta.
      await repo.participar(tx, oficialId, u.est5);

      const agenda = await repo.listar(tx, { ...filtroBase, incluirOficiales: 'agregados' });
      const enAgenda = agenda.find((e) => e.id === oficialId);
      expect(enAgenda?.participo).toBe(true);
      expect(agenda.find((e) => e.id === personalId)?.participo).toBe(false);

      // abandonar: desaparece de 'agregados' de nuevo.
      await repo.abandonar(tx, oficialId, u.est5);
      const despues = await repo.listar(tx, { ...filtroBase, incluirOficiales: 'agregados' });
      expect(despues.map((e) => e.id)).not.toContain(oficialId);
    });
  });
});
