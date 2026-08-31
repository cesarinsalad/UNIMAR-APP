import 'dotenv/config';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { Pool, type PoolClient } from 'pg';
import { PostgresUsuarioRepository } from './postgresUsuarioRepository';
import { NotFoundError } from '../../../shared/errors';

const RUN_DB_TESTS = process.env.RUN_DB_TESTS === '1';
const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://app_bff:app_bff_dev_password@localhost:54322/postgres';

/**
 * Tests de integración del `PostgresUsuarioRepository` (Paso 5).
 *
 * Cubre los dos métodos del shared kernel que añadió el Paso 5:
 *  - `obtenerCedula(tx, usuarioId)` (UUID → cédula).
 *  - `obtenerUsuarioIdPorCedula(tx, cedula)` (cédula → UUID).
 *
 * Ambos se usan en Académico sin pasar por `tx.query` directo, preservando
 * la metodología DSBC. Este test es la evidencia de que las direcciones del
 * mapeo funcionan contra el esquema real.
 */
describe.skipIf(!RUN_DB_TESTS)('PostgresUsuarioRepository (ABAC)', () => {
  let pool: Pool;

  beforeAll(() => {
    pool = new Pool({ connectionString: DATABASE_URL });
  });

  afterAll(async () => {
    await pool.end();
  });

  async function withTx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
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

  async function seedUsuario(client: PoolClient, cedula: string): Promise<string> {
    const ts = Date.now();
    const result = await client.query<{ id: string }>(
      "INSERT INTO usuarios (cedula, nombre, email, rol_id) VALUES ($1, 'Test', $2, (SELECT id FROM roles WHERE nombre='ESTUDIANTE')) RETURNING id",
      [cedula, `t-${ts}@test.ve`],
    );
    return result.rows[0]!.id;
  }

  it('obtenerCedula: UUID → cédula', async () => {
    const repo = new PostgresUsuarioRepository();
    await withTx(async (c) => {
      const id = await seedUsuario(c, 'V-1234567');
      const cedula = await repo.obtenerCedula(c, id);
      expect(cedula).toBe('V-1234567');
    });
  });

  it('obtenerCedula: usuario inexistente lanza NotFoundError', async () => {
    const repo = new PostgresUsuarioRepository();
    await withTx(async (c) => {
      await expect(repo.obtenerCedula(c, '00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  it('obtenerUsuarioIdPorCedula: cédula → UUID', async () => {
    const repo = new PostgresUsuarioRepository();
    await withTx(async (c) => {
      const id = await seedUsuario(c, 'V-7654321');
      const usuarioId = await repo.obtenerUsuarioIdPorCedula(c, 'V-7654321');
      expect(usuarioId).toBe(id);
    });
  });

  it('obtenerUsuarioIdPorCedula: cédula inexistente lanza NotFoundError', async () => {
    const repo = new PostgresUsuarioRepository();
    await withTx(async (c) => {
      await expect(repo.obtenerUsuarioIdPorCedula(c, 'NO-EXISTE')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  it('roundtrip: obtenerCedula(obtenerUsuarioIdPorCedula(x)) === x', async () => {
    const repo = new PostgresUsuarioRepository();
    await withTx(async (c) => {
      const cedulaOriginal = 'V-9999999';
      await seedUsuario(c, cedulaOriginal);
      const uuid = await repo.obtenerUsuarioIdPorCedula(c, cedulaOriginal);
      const cedulaDeVuelta = await repo.obtenerCedula(c, uuid);
      expect(cedulaDeVuelta).toBe(cedulaOriginal);
    });
  });
});
