import 'dotenv/config';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { UnitOfWork } from './unitOfWork';

const RUN_DB_TESTS = process.env.RUN_DB_TESTS === '1';
const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://app_bff:app_bff_dev_password@localhost:54322/postgres';

function claimsFor(userId: string, decanatoId: number | null, nombre: string) {
  return JSON.stringify({ sub: userId, role: 'ESTUDIANTE', decanato_id: decanatoId, nombre });
}

/**
 * Integración de RLS contra el Supabase local.
 *
 * Estos tests son la evidencia ejecutable del modelo ABAC:
 * - Sin claims, app_bff no puede tocar filas de dispositivos (fail-closed).
 * - Con claims de un usuario, solo ve/suas propias filas.
 *
 * Se saltan salvo que se pase RUN_DB_TESTS=1, para que `npm test` no dependa de Docker.
 */
describe.skipIf(!RUN_DB_TESTS)('RLS integration (ABAC)', () => {
  let pool: Pool;
  let uow: UnitOfWork;

  beforeAll(() => {
    pool = new Pool({ connectionString: DATABASE_URL });
    uow = new UnitOfWork(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('sin claims: dispositivos es fail-closed, pero usuarios sigue accesible para app_bff', async () => {
    await uow.run(async (tx) => {
      // Tabla de sistema: app_bff puede leer sin claims
      const users = await tx.query('SELECT count(*) AS n FROM usuarios');
      expect(Number(users.rows[0].n)).toBeGreaterThan(0);

      // Tabla con ABAC: sin claims, INSERT debe ser denegado
      await tx.query('SAVEPOINT sp_no_claims');
      try {
        await tx.query(
          "INSERT INTO dispositivos (usuario_id, push_token, plataforma) VALUES (gen_random_uuid(), 'tok', 'android')",
        );
        expect.fail('debería haber lanzado error de RLS');
      } catch (err: any) {
        expect(err.code).toBe('42501'); // insufficient_privilege
      }
      await tx.query('ROLLBACK TO SAVEPOINT sp_no_claims');

      // Y SELECT devuelve 0 filas (fail-closed)
      const rows = await tx.query('SELECT count(*) AS n FROM dispositivos');
      expect(Number(rows.rows[0].n)).toBe(0);
    });
  });

  it('un usuario solo ve y modifica sus propios dispositivos', async () => {
    const ts = Date.now();
    const cedulaA = `TEST-${ts}-A`;
    const cedulaB = `TEST-${ts}-B`;

    // Usamos una transacción manual con ROLLBACK para no dejar datos de prueba.
    // uow.runAs no sirve aquí porque toma una NUEVA conexión del pool, así que
    // no vería los usuarios insertados en esta transacción.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Crear dos usuarios de prueba (usuarios es tabla de sistema para app_bff)
      const aRes = await client.query<{ id: string }>(
        "INSERT INTO usuarios (cedula, nombre, email, rol_id) VALUES ($1, 'A', 'a@u.ve', (SELECT id FROM roles WHERE nombre='ESTUDIANTE')) RETURNING id",
        [cedulaA],
      );
      const bRes = await client.query<{ id: string }>(
        "INSERT INTO usuarios (cedula, nombre, email, rol_id) VALUES ($1, 'B', 'b@u.ve', (SELECT id FROM roles WHERE nombre='ESTUDIANTE')) RETURNING id",
        [cedulaB],
      );

      const idA = aRes.rows[0]!.id;
      const idB = bRes.rows[0]!.id;

      // A crea un dispositivo como A
      await client.query('SELECT set_config($1, $2, true)', [
        'request.jwt.claims',
        claimsFor(idA, 5, 'A'),
      ]);
      await client.query(
        "INSERT INTO dispositivos (usuario_id, push_token, plataforma) VALUES ($1, 'tok-a', 'android')",
        [idA],
      );

      // A solo ve su dispositivo
      const visiblesA = await client.query('SELECT usuario_id FROM dispositivos');
      expect(visiblesA.rows).toHaveLength(1);
      expect(visiblesA.rows[0].usuario_id).toBe(idA);

      // Cambiamos a B dentro de la misma transacción
      await client.query('SELECT set_config($1, $2, true)', [
        'request.jwt.claims',
        claimsFor(idB, 3, 'B'),
      ]);

      // B no ve el dispositivo de A
      const visiblesB = await client.query('SELECT usuario_id FROM dispositivos');
      expect(visiblesB.rows).toHaveLength(0);

      // B intenta borrar el dispositivo de A → 0 filas afectadas
      const deletion = await client.query(
        'DELETE FROM dispositivos WHERE usuario_id = $1',
        [idA],
      );
      expect(deletion.rowCount).toBe(0);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });
});
