import 'dotenv/config';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { Pool, type PoolClient } from 'pg';
import type { DbTx } from '../../../shared/kernel/db';
import { PostgresComunicadoRepository } from './postgresComunicadoRepository';

/**
 * Integración de la función `alcance_comunicados`: verifica que el
 * COMUNICADOR reciba los publicados globales y los de su decanato, pero no
 * los de otro decanato, y que el ADMIN reciba todos.
 */
const RUN_DB_TESTS = process.env.RUN_DB_TESTS === '1';
const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://app_bff:app_bff_dev_password@localhost:54322/postgres';

describe.skipIf(!RUN_DB_TESTS)('Repo Comunicados: alcance agregado', () => {
  let pool: Pool;
  const repo = new PostgresComunicadoRepository();

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

  async function setClaims(c: PoolClient, sub: string, role: string, decanato: number | null) {
    await c.query('SELECT set_config($1, $2, true)', [
      'request.jwt.claims',
      JSON.stringify({ sub, role, decanato_id: decanato, nombre: 'Test' }),
    ]);
  }

  async function crearPublicado(
    c: PoolClient,
    titulo: string,
    autorId: string,
    decanatoId: number | null,
    programadoPara: string | null = null,
  ): Promise<string> {
    const result = await c.query<{ id: string }>(
      "INSERT INTO comunicados (titulo, cuerpo, autor_id, estado, publicado_at, programado_para) VALUES ($1, 'cuerpo', $2, 'PUBLICADO', now(), $3) RETURNING id",
      [titulo, autorId, programadoPara],
    );
    const id = result.rows[0]!.id;
    if (decanatoId !== null) {
      await c.query(
        'INSERT INTO comunicado_audiencias (comunicado_id, decanato_id) VALUES ($1, $2)',
        [id, decanatoId],
      );
    }
    return id;
  }

  it('ADMIN ve todo; COMUNICADOR ve global + su decanato', async () => {
    await withTx(async (c) => {
      const tx = c as unknown as DbTx;
      const ts = Date.now();
      const admin = await c.query<{ id: string }>(
        "INSERT INTO usuarios (cedula, nombre, email, rol_id) VALUES ($1, 'Admin alcance', $2, (SELECT id FROM roles WHERE nombre='ADMIN')) RETURNING id",
        [`ALC-${ts}-A`, `alcance-${ts}-a@test.ve`],
      );
      const comunicador = await c.query<{ id: string }>(
        "INSERT INTO usuarios (cedula, nombre, email, rol_id, decanato_id) VALUES ($1, 'Com alcance', $2, (SELECT id FROM roles WHERE nombre='COMUNICADOR'), 5) RETURNING id",
        [`ALC-${ts}-C`, `alcance-${ts}-c@test.ve`],
      );
      const estudiante5 = await c.query<{ id: string }>(
        "INSERT INTO usuarios (cedula, nombre, email, rol_id, decanato_id) VALUES ($1, 'Est 5', $2, (SELECT id FROM roles WHERE nombre='ESTUDIANTE'), 5) RETURNING id",
        [`ALC-${ts}-E5`, `alcance-${ts}-e5@test.ve`],
      );
      await c.query(
        "INSERT INTO usuarios (cedula, nombre, email, rol_id, decanato_id) VALUES ($1, 'Est 2', $2, (SELECT id FROM roles WHERE nombre='ESTUDIANTE'), 2)",
        [`ALC-${ts}-E2`, `alcance-${ts}-e2@test.ve`],
      );
      const adminId = admin.rows[0]!.id;
      await setClaims(c, adminId, 'ADMIN', null);

      const marker = `ALC-${ts}`;
      const globalId = await crearPublicado(c, `${marker} global`, adminId, null);
      const dec5Id = await crearPublicado(c, `${marker} dec5`, adminId, 5);
      const dec2Id = await crearPublicado(c, `${marker} dec2`, adminId, 2);
      // Publicación programada: tiene publicado_at, pero todavía no es visible.
      await crearPublicado(c, `${marker} futuro`, adminId, null, 'infinity');

      // Una lectura de la estudiante del decanato 5 en cada comunicado.
      const estudiante5Id = estudiante5.rows[0]!.id;
      await setClaims(c, estudiante5Id, 'ESTUDIANTE', 5);
      await c.query(
        'INSERT INTO comunicado_lecturas (comunicado_id, usuario_id) VALUES ($1, $2), ($3, $2), ($4, $2)',
        [globalId, estudiante5Id, dec5Id, dec2Id],
      );

      const titulos = (items: Awaited<ReturnType<typeof repo.listarAlcanceComunicados>>) =>
        items.filter((i) => i.titulo.startsWith(marker)).map((i) => i.titulo);

      await setClaims(c, adminId, 'ADMIN', null);
      const adminRows = await repo.listarAlcanceComunicados(tx, 30);
      expect(titulos(adminRows).sort()).toEqual([
        `${marker} dec2`,
        `${marker} dec5`,
        `${marker} global`,
      ]);
      const global = adminRows.find((i) => i.titulo === `${marker} global`);
      expect(global?.audiencia).toBeGreaterThanOrEqual(2);
      const segmentada = adminRows.find((i) => i.titulo === `${marker} dec5`);
      expect(segmentada?.audiencia).toBeGreaterThanOrEqual(1);
      expect(segmentada?.lecturas).toBe(1);

      await setClaims(c, comunicador.rows[0]!.id, 'COMUNICADOR', 5);
      const comRows = await repo.listarAlcanceComunicados(tx, 30);
      expect(titulos(comRows).sort()).toEqual([`${marker} dec5`, `${marker} global`]);
      expect(titulos(comRows)).not.toContain(`${marker} dec2`);
    });
  });
});
