import 'dotenv/config';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { Pool, type PoolClient } from 'pg';
import type { DbTx } from '../../../shared/kernel/db';
import { PostgresComunicadoRepository } from './postgresComunicadoRepository';

/**
 * Integración de la búsqueda textual (`q`) del repositorio de comunicados:
 * ILIKE sobre título y cuerpo, case-insensitive, combinable con `categoria`
 * y con la paginación offset. Corre el repo real, RLS activa bajo claims.
 * También cubre `contar` (mismos filtros, sin paginar) y `contarPorEstado`,
 * que el listado {items,total} y el Panel de Gestión consumen.
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

  it('q también encuentra por cuerpo (no solo título)', async () => {
    await withTx(async (c) => {
      const tx = c as unknown as DbTx;
      const ts = Date.now();
      const autor = await c.query<{ id: string }>(
        "INSERT INTO usuarios (cedula, nombre, email, rol_id) VALUES ($1, 'Autor Q2', $2, (SELECT id FROM roles WHERE nombre='ADMIN')) RETURNING id",
        [`Q2-${ts}-A`, `q2-autor-${ts}@test.ve`],
      );
      const autorId = autor.rows[0]!.id;
      await setClaims(c, claimsFor(autorId, 'ADMIN', null));

      await tx.query(
        `INSERT INTO comunicados (titulo, cuerpo, autor_id, estado, publicado_at, categoria)
         VALUES
         ('Anuncio académico', 'El sello variado aparece en el cuerpo ${ts}', $1, 'PUBLICADO', now(), 'ACADEMICO')`,
        [autorId],
      );

      const enCuerpo = await repo.listar(tx, { q: `sello variado`, limit: 50, offset: 0 });
      expect(enCuerpo).toHaveLength(1);
      expect(enCuerpo[0]?.titulo).toContain('Anuncio académico');
    });
  });

  it('contar usa los mismos filtros que listar y no se ve afectado por limit/offset', async () => {
    await withTx(async (c) => {
      const tx = c as unknown as DbTx;
      const ts = Date.now();
      const autor = await c.query<{ id: string }>(
        "INSERT INTO usuarios (cedula, nombre, email, rol_id) VALUES ($1, 'Autor Q3', $2, (SELECT id FROM roles WHERE nombre='ADMIN')) RETURNING id",
        [`Q3-${ts}-A`, `q3-autor-${ts}@test.ve`],
      );
      const autorId = autor.rows[0]!.id;
      await setClaims(c, claimsFor(autorId, 'ADMIN', null));

      await tx.query(
        `INSERT INTO comunicados (titulo, cuerpo, autor_id, estado, publicado_at, categoria)
         VALUES
         ('ZebraQuiz A', 'cuerpo', $1, 'PUBLICADO', now(), 'EVENTO'),
         ('ZebraQuiz B', 'cuerpo', $1, 'PUBLICADO', now(), 'EVENTO'),
         ('Sin marca', 'cuerpo', $1, 'PUBLICADO', now(), 'EVENTO')`,
        [autorId],
      );

      const total = await repo.contar(tx, { estado: 'PUBLICADO', q: 'zebraquiz' });
      const pagina = await repo.listar(tx, { estado: 'PUBLICADO', q: 'zebraquiz', limit: 1, offset: 0 });
      expect(total).toBe(2);
      expect(pagina).toHaveLength(1); // paginados, pero el count sigue siendo 2

      const sinFiltro = await repo.contar(tx, {});
      expect(sinFiltro).toBeGreaterThanOrEqual(3);
    });
  });

  it('contarPorEstado devuelve un conteo para cada estado conocido', async () => {
    await withTx(async (c) => {
      const tx = c as unknown as DbTx;
      const ts = Date.now();
      const autor = await c.query<{ id: string }>(
        "INSERT INTO usuarios (cedula, nombre, email, rol_id) VALUES ($1, 'Autor Q4', $2, (SELECT id FROM roles WHERE nombre='ADMIN')) RETURNING id",
        [`Q4-${ts}-A`, `q4-autor-${ts}@test.ve`],
      );
      const autorId = autor.rows[0]!.id;
      await setClaims(c, claimsFor(autorId, 'ADMIN', null));

      await tx.query(
        `INSERT INTO comunicados (titulo, cuerpo, autor_id, estado, publicado_at)
         VALUES
         ('Pendiente uno', 'cuerpo', $1, 'PENDIENTE', now()),
         ('Pendiente dos', 'cuerpo', $1, 'PENDIENTE', now())`,
        [autorId],
      );

      const conteos = await repo.contarPorEstado(tx);
      expect(conteos.BORRADOR).toBe(0);
      expect(conteos.PENDIENTE).toBeGreaterThanOrEqual(2);
      // El seed/local puede traer otros estados; claves siempre presentes.
      expect(typeof conteos.PUBLICADO).toBe('number');
      expect(typeof conteos.ARCHIVADO).toBe('number');
    });
  });
});
