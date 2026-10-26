import 'dotenv/config';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { Pool, type PoolClient } from 'pg';
import type { DbTx } from '../../../shared/kernel/db';
import { PostgresComunicadoRepository } from './postgresComunicadoRepository';

/**
 * Integración de la búsqueda textual (`q`) del repositorio de comunicados:
 * ILIKE sobre el título, case-insensitive, combinable con `categoria` y
 * con la paginación offset. Corre el repo real, RLS activa bajo claims.
 */
const RUN_DB_TESTS = process.env.RUN_DB_TESTS === '1';
const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://app_bff:app_bff_dev_password@localhost:54322/postgres';

describe.skipIf(!RUN_DB_TESTS)('Repo Comunicados: búsqueda q', () => {
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

  function claimsFor(userId: string, role: string, decanatoId: number | null): string {
    return JSON.stringify({ sub: userId, role, decanato_id: decanatoId, nombre: 'T' });
  }

  async function setClaims(c: PoolClient, json: string): Promise<void> {
    await c.query('SELECT set_config($1, $2, true)', ['request.jwt.claims', json]);
  }

  it('encuentra por parcial de título (case-insensitive) y combina con categoría', async () => {
    await withTx(async (c) => {
      const tx = c as unknown as DbTx;
      const ts = Date.now();
      const autor = await c.query<{ id: string }>(
        "INSERT INTO usuarios (cedula, nombre, email, rol_id) VALUES ($1, 'Autor Q', $2, (SELECT id FROM roles WHERE nombre='ADMIN')) RETURNING id",
        [`Q-${ts}-A`, `q-autor-${ts}@test.ve`],
      );
      const autorId = autor.rows[0]!.id;
      await setClaims(c, claimsFor(autorId, 'ADMIN', null));

      // El marcador único evita colisiones con el seed real del BFF.
      // Fechas dentro de la ventana de visibilidad (publicado, sin expirar).
      await tx.query(
        `INSERT INTO comunicados (titulo, cuerpo, autor_id, estado, publicado_at, categoria)
         VALUES
         ('Recital de Jazz ZebraQuiz 2026', 'cuerpo', $1, 'PUBLICADO', now(), 'EVENTO'),
         ('Liga de eSports ZebraQuiz cierra la fase', 'cuerpo', $1, 'PUBLICADO', now(), 'ACADEMICO'),
         ('Biblioteca abre 24 horas', 'cuerpo', $1, 'PUBLICADO', now(), 'INSTITUCIONAL')`,
        [autorId],
      );

      // q parcial case-insensitive
      const porQ = await repo.listar(tx, { q: 'zebraquiz', limit: 50, offset: 0 });
      const titulos = porQ.map((c2) => c2.titulo.toLowerCase());
      expect(titulos.some((t) => t.includes('recital de jazz zebraquiz'))).toBe(true);
      expect(titulos.some((t) => t.includes('liga de esports zebraquiz'))).toBe(true);
      expect(titulos.some((t) => t.includes('biblioteca abre'))).toBe(false);

      // q + categoria combinados
      const combinado = await repo.listar(tx, { q: 'ZEBRAQUIZ', categoria: 'ACADEMICO', limit: 50, offset: 0 });
      expect(combinado.map((c2) => c2.titulo)).toEqual(
        expect.arrayContaining([expect.stringContaining('Liga de eSports')]),
      );
      expect(combinado).toHaveLength(1);
    });
  });
});
