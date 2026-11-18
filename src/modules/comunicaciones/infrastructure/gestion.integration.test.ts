import 'dotenv/config';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { Pool, type PoolClient } from 'pg';
import type { DbTx } from '../../../shared/kernel/db';
import { PostgresComunicadoRepository } from './postgresComunicadoRepository';

/**
 * Integración del alcance editorial: `gestion` recorta el listado de un
 * COMUNICADOR a los autores de su decanato, sin alterar la visibilidad del
 * feed (RLS) ni el alcance del ADMIN.
 */
const RUN_DB_TESTS = process.env.RUN_DB_TESTS === '1';
const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://app_bff:app_bff_dev_password@localhost:54322/postgres';

describe.skipIf(!RUN_DB_TESTS)('Repo Comunicados: alcance de gestión', () => {
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

  async function crearUsuario(
    c: PoolClient,
    cedula: string,
    rol: string,
    decanato: number | null,
  ): Promise<string> {
    const result = await c.query<{ id: string }>(
      'INSERT INTO usuarios (cedula, nombre, email, rol_id, decanato_id) VALUES ($1, $2, $3, (SELECT id FROM roles WHERE nombre = $4), $5) RETURNING id',
      [cedula, `Test ${cedula}`, `${cedula}@test.ve`, rol, decanato],
    );
    return result.rows[0]!.id;
  }

  async function crearPublicado(c: PoolClient, titulo: string, autorId: string): Promise<void> {
    await c.query(
      "INSERT INTO comunicados (titulo, cuerpo, autor_id, estado, publicado_at) VALUES ($1, 'cuerpo', $2, 'PUBLICADO', now())",
      [titulo, autorId],
    );
  }

  it('gestion=true excluye publicados de autores de otro decanato', async () => {
    await withTx(async (c) => {
      const tx = c as unknown as DbTx;
      const ts = Date.now();
      const admin = await crearUsuario(c, `GES-${ts}-A`, 'ADMIN', null);
      const com5 = await crearUsuario(c, `GES-${ts}-C5`, 'COMUNICADOR', 5);
      const com5b = await crearUsuario(c, `GES-${ts}-C5B`, 'COMUNICADOR', 5);
      const com2 = await crearUsuario(c, `GES-${ts}-C2`, 'COMUNICADOR', 2);

      const marker = `GESTION-${ts}`;
      await setClaims(c, admin, 'ADMIN', null);
      await crearPublicado(c, `${marker} global admin`, admin);
      await setClaims(c, com5, 'COMUNICADOR', 5);
      await crearPublicado(c, `${marker} propio dec5`, com5);
      await setClaims(c, com5b, 'COMUNICADOR', 5);
      await crearPublicado(c, `${marker} colega dec5`, com5b);
      await setClaims(c, com2, 'COMUNICADOR', 2);
      await crearPublicado(c, `${marker} ajeno dec2`, com2);

      await setClaims(c, com5, 'COMUNICADOR', 5);
      const items = await repo.listar(tx, {
        gestion: { autorId: com5, decanatoId: 5 },
        limit: 50,
        offset: 0,
      });
      const titulos = items
        .filter((item) => item.titulo.startsWith(marker))
        .map((item) => item.titulo)
        .sort();
      expect(titulos).toEqual([
        `${marker} colega dec5`,
        `${marker} propio dec5`,
      ]);

      const total = await repo.contar(tx, {
        gestion: { autorId: com5, decanatoId: 5 },
      });
      expect(total).toBeGreaterThanOrEqual(2);
    });
  });

  it('ADMIN excluye BORRADOR ajenos en listar, contar y contarPorEstado, pero ve PENDIENTE, PUBLICADO y su BORRADOR', async () => {
    await withTx(async (c) => {
      const tx = c as unknown as DbTx;
      const ts = Date.now();
      const admin = await crearUsuario(c, `ADM-${ts}-A`, 'ADMIN', null);
      const com5 = await crearUsuario(c, `ADM-${ts}-C5`, 'COMUNICADOR', 5);
      const marker = `ADM-BORR-${ts}`;

      await setClaims(c, com5, 'COMUNICADOR', 5);
      await c.query(
        "INSERT INTO comunicados (titulo, cuerpo, autor_id, estado) VALUES ($1, 'cuerpo', $2, 'BORRADOR')",
        [`${marker} borrador ajeno`, com5],
      );
      await c.query(
        "INSERT INTO comunicados (titulo, cuerpo, autor_id, estado) VALUES ($1, 'cuerpo', $2, 'PENDIENTE')",
        [`${marker} pendiente ajeno`, com5],
      );
      await crearPublicado(c, `${marker} publicado ajeno`, com5);

      await setClaims(c, admin, 'ADMIN', null);
      await c.query(
        "INSERT INTO comunicados (titulo, cuerpo, autor_id, estado) VALUES ($1, 'cuerpo', $2, 'BORRADOR')",
        [`${marker} borrador propio`, admin],
      );

      const items = await repo.listar(tx, { q: marker, limit: 50, offset: 0 });
      const titulos = items.map((item) => item.titulo).sort();
      expect(titulos).toEqual([
        `${marker} borrador propio`,
        `${marker} pendiente ajeno`,
        `${marker} publicado ajeno`,
      ]);

      const totalTodos = await repo.contar(tx, { q: marker });
      expect(totalTodos).toBe(3);

      const totalBorradores = await repo.contar(tx, { q: marker, estado: 'BORRADOR' });
      expect(totalBorradores).toBe(1);

      const conteos = await repo.contarPorEstado(tx);
      const borradoresVisibles = await repo.contar(tx, { estado: 'BORRADOR' });
      expect(conteos.BORRADOR).toBe(borradoresVisibles);
    });
  });
});
