import 'dotenv/config';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { Pool, type PoolClient } from 'pg';

const RUN_DB_TESTS = process.env.RUN_DB_TESTS === '1';
const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://app_bff:app_bff_dev_password@localhost:54322/postgres';

function claimsFor(
  userId: string,
  role: 'ADMIN' | 'COMUNICADOR' | 'ESTUDIANTE',
  decanatoId: number | null,
  nombre: string,
) {
  return JSON.stringify({ sub: userId, role, decanato_id: decanatoId, nombre });
}

async function setClaims(client: PoolClient, json: string): Promise<void> {
  await client.query('SELECT set_config($1, $2, true)', ['request.jwt.claims', json]);
}

interface TestUsuarios {
  adminId: string;
  com5: string;
  est5: string;
  est3: string;
}

/**
 * Integración de RLS para el componente Notificaciones.
 *
 * Evidencia ejecutable del modelo ABAC del Paso 3:
 * - notificaciones: INSERT libre para app_bff (escenario fan-out), pero
 *   SELECT/UPDATE/DELETE solo sobre filas propias (fail-closed).
 * - dispositivos: escritura por dueño; el SELECT en modo sistema (sin claims)
 *   solo aplica para resolver tokens del fan-out (política
 *   `dispositivos_select_sistema`), no bajo claims de usuario.
 *
 * Se saltan salvo que se pase RUN_DB_TESTS=1. Patrón: transacción manual con
 * ROLLBACK final para no dejar datos de prueba.
 */
describe.skipIf(!RUN_DB_TESTS)('RLS Notificaciones (ABAC)', () => {
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

  async function seedUsuarios(client: PoolClient): Promise<TestUsuarios> {
    const ts = Date.now();
    const admin = await client.query<{ id: string }>(
      "INSERT INTO usuarios (cedula, nombre, email, rol_id) VALUES ($1, 'Admin Test', $2, (SELECT id FROM roles WHERE nombre='ADMIN')) RETURNING id",
      [`TEST-${ts}-A`, `admin-${ts}@test.ve`],
    );
    const com5 = await client.query<{ id: string }>(
      "INSERT INTO usuarios (cedula, nombre, email, rol_id, decanato_id) VALUES ($1, 'COM 5', $2, (SELECT id FROM roles WHERE nombre='COMUNICADOR'), 5) RETURNING id",
      [`TEST-${ts}-C5`, `com5-${ts}@test.ve`],
    );
    const est5 = await client.query<{ id: string }>(
      "INSERT INTO usuarios (cedula, nombre, email, rol_id, decanato_id) VALUES ($1, 'EST 5', $2, (SELECT id FROM roles WHERE nombre='ESTUDIANTE'), 5) RETURNING id",
      [`TEST-${ts}-E5`, `est5-${ts}@test.ve`],
    );
    const est3 = await client.query<{ id: string }>(
      "INSERT INTO usuarios (cedula, nombre, email, rol_id, decanato_id) VALUES ($1, 'EST 3', $2, (SELECT id FROM roles WHERE nombre='ESTUDIANTE'), 3) RETURNING id",
      [`TEST-${ts}-E3`, `est3-${ts}@test.ve`],
    );

    return {
      adminId: admin.rows[0]!.id,
      com5: com5.rows[0]!.id,
      est5: est5.rows[0]!.id,
      est3: est3.rows[0]!.id,
    };
  }

  // ──────────────────────────────────────────────────────────
  // notificaciones: INSERT (escenario fan-out)
  // ──────────────────────────────────────────────────────────
  describe('notificaciones INSERT', () => {
    it('sin claims: INSERT permitido (fan-out del sistema)', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        // Sin RETURNING: la política INSERT es `WITH CHECK(true)` y el fan-out
        // no relee la fila (la releería bajo SELECT, que sí es por dueño).
        const result = await c.query(
          "INSERT INTO notificaciones (usuario_id, tipo, titulo, cuerpo, referencia_id) VALUES ($1, 'COMUNICADO_PUBLICADO', 't', 'c', NULL)",
          [u.est5],
        );
        expect(result.rowCount).toBe(1);
      });
    });

    it('con claims del publicador: puede crear fila para OTRO usuario', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.com5, 'COMUNICADOR', 5, 'COM5'));

        const result = await c.query(
          "INSERT INTO notificaciones (usuario_id, tipo, titulo, cuerpo, referencia_id) VALUES ($1, 'COMUNICADO_PUBLICADO', 't', 'c', NULL)",
          [u.est5],
        );
        expect(result.rowCount).toBe(1);
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  // notificaciones: SELECT
  // ──────────────────────────────────────────────────────────
  describe('notificaciones SELECT', () => {
    it('un usuario solo ve sus propias notificaciones', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await c.query(
          "INSERT INTO notificaciones (usuario_id, tipo, titulo, cuerpo, referencia_id) VALUES ($1, 'COMUNICADO_PUBLICADO', 't', 'c', NULL)",
          [u.est5],
        );
        await c.query(
          "INSERT INTO notificaciones (usuario_id, tipo, titulo, cuerpo, referencia_id) VALUES ($1, 'COMUNICADO_PUBLICADO', 't', 'c', NULL)",
          [u.est3],
        );

        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'EST5'));
        const result = await c.query<{ usuario_id: string }>('SELECT usuario_id FROM notificaciones');
        expect(result.rows.every((r) => r.usuario_id === u.est5)).toBe(true);
        expect(result.rows).toHaveLength(1);
      });
    });

    it('sin claims: SELECT devuelve 0 filas (fail-closed)', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await c.query(
          "INSERT INTO notificaciones (usuario_id, tipo, titulo, cuerpo, referencia_id) VALUES ($1, 'COMUNICADO_PUBLICADO', 't', 'c', NULL)",
          [u.est5],
        );

        const result = await c.query('SELECT count(*)::int AS n FROM notificaciones');
        expect(result.rows[0]!.n).toBe(0);
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  // notificaciones: UPDATE / DELETE
  // ──────────────────────────────────────────────────────────
  describe('notificaciones UPDATE/DELETE', () => {
    it('marca como leída su propia notificación', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'EST5'));
        const notif = await c.query<{ id: string }>(
          "INSERT INTO notificaciones (usuario_id, tipo, titulo, cuerpo, referencia_id) VALUES ($1, 'COMUNICADO_PUBLICADO', 't', 'c', NULL) RETURNING id",
          [u.est5],
        );

        const result = await c.query(
          'UPDATE notificaciones SET leida = true WHERE id = $1',
          [notif.rows[0]!.id],
        );
        expect(result.rowCount).toBe(1);
      });
    });

    it('no puede actualizar una notificación ajena -> 0 filas', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'EST5'));
        const notif = await c.query<{ id: string }>(
          "INSERT INTO notificaciones (usuario_id, tipo, titulo, cuerpo, referencia_id) VALUES ($1, 'COMUNICADO_PUBLICADO', 't', 'c', NULL) RETURNING id",
          [u.est5],
        );
        await setClaims(c, claimsFor(u.est3, 'ESTUDIANTE', 3, 'EST3'));

        const result = await c.query(
          'UPDATE notificaciones SET leida = true WHERE id = $1',
          [notif.rows[0]!.id],
        );
        expect(result.rowCount).toBe(0);
      });
    });

    it('borra su propia notificación', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'EST5'));
        const notif = await c.query<{ id: string }>(
          "INSERT INTO notificaciones (usuario_id, tipo, titulo, cuerpo, referencia_id) VALUES ($1, 'COMUNICADO_PUBLICADO', 't', 'c', NULL) RETURNING id",
          [u.est5],
        );

        const result = await c.query('DELETE FROM notificaciones WHERE id = $1', [
          notif.rows[0]!.id,
        ]);
        expect(result.rowCount).toBe(1);
      });
    });

    it('no puede borrar una notificación ajena -> 0 filas', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'EST5'));
        const notif = await c.query<{ id: string }>(
          "INSERT INTO notificaciones (usuario_id, tipo, titulo, cuerpo, referencia_id) VALUES ($1, 'COMUNICADO_PUBLICADO', 't', 'c', NULL) RETURNING id",
          [u.est5],
        );
        await setClaims(c, claimsFor(u.est3, 'ESTUDIANTE', 3, 'EST3'));

        const result = await c.query('DELETE FROM notificaciones WHERE id = $1', [
          notif.rows[0]!.id,
        ]);
        expect(result.rowCount).toBe(0);
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  // dispositivos: escritura por dueño + SELECT en modo sistema
  // ──────────────────────────────────────────────────────────
  describe('dispositivos (fan-out)', () => {
    it('el upsert del mismo usuario actualiza su propio dispositivo', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'EST5'));

        await c.query(
          "INSERT INTO dispositivos (usuario_id, push_token, plataforma) VALUES ($1, 'tok-x', 'android')",
          [u.est5],
        );
        const result = await c.query<{ plataforma: string; ultimo_uso_at: Date | null }>(
          `INSERT INTO dispositivos (usuario_id, push_token, plataforma)
           VALUES ($1, 'tok-x', 'ios')
           ON CONFLICT (push_token) DO UPDATE
             SET plataforma = EXCLUDED.plataforma, ultimo_uso_at = now()
             WHERE dispositivos.usuario_id = EXCLUDED.usuario_id
           RETURNING plataforma, ultimo_uso_at`,
          [u.est5],
        );
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0]!.plataforma).toBe('ios');
        expect(result.rows[0]!.ultimo_uso_at).not.toBeNull();
      });
    });

    it('un token de OTRO usuario no se re-asigna (RETURNING vacío)', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        // est5 registra el token
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'EST5'));
        await c.query(
          "INSERT INTO dispositivos (usuario_id, push_token, plataforma) VALUES ($1, 'tok-ajeno', 'android')",
          [u.est5],
        );

        // est3 intenta registrar el mismo token
        await setClaims(c, claimsFor(u.est3, 'ESTUDIANTE', 3, 'EST3'));
        const result = await c.query(
          `INSERT INTO dispositivos (usuario_id, push_token, plataforma)
           VALUES ($1, 'tok-ajeno', 'android')
           ON CONFLICT (push_token) DO UPDATE
             SET plataforma = EXCLUDED.plataforma, ultimo_uso_at = now()
             WHERE dispositivos.usuario_id = EXCLUDED.usuario_id
           RETURNING id`,
          [u.est3],
        );
        expect(result.rows).toHaveLength(0);
      });
    });

    it('bajo claims, un usuario solo ve sus dispositivos (no el SELECT del sistema)', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'EST5'));
        await c.query(
          "INSERT INTO dispositivos (usuario_id, push_token, plataforma) VALUES ($1, 'tok-est5', 'android')",
          [u.est5],
        );
        await setClaims(c, claimsFor(u.est3, 'ESTUDIANTE', 3, 'EST3'));
        await c.query(
          "INSERT INTO dispositivos (usuario_id, push_token, plataforma) VALUES ($1, 'tok-est3', 'android')",
          [u.est3],
        );

        const result = await c.query<{ usuario_id: string }>(
          'SELECT usuario_id FROM dispositivos',
        );
        expect(result.rows.every((r) => r.usuario_id === u.est3)).toBe(true);
        expect(result.rows).toHaveLength(1);
      });
    });

    it('en modo sistema (sin claims), SELECT devuelve los dispositivos del fan-out', async () => {
      // En producción el fan-out resuelve tokens con `uow.run` (NUEVA conexión
      // sin claims, donde el GUC `request.jwt.claims` es NULL). No se puede
      // simular dentro de la misma transacción (RESET/set_config(NULL) dejan ''
      // y no NULL), así que se commitea un dispositivo y se relee desde una
      // conexión limpia.
      const ts = Date.now();
      const c = await pool.connect();
      let userId!: string;
      let devId!: string;
      try {
        await c.query('BEGIN');
        const u = await c.query<{ id: string }>(
          "INSERT INTO usuarios (cedula, nombre, email, rol_id, decanato_id) VALUES ($1, 'SYS', $2, (SELECT id FROM roles WHERE nombre='ESTUDIANTE'), 5) RETURNING id",
          [`TEST-${ts}-SYS`, `sys-${ts}@test.ve`],
        );
        userId = u.rows[0]!.id;
        await c.query('SELECT set_config($1, $2, false)', [
          'request.jwt.claims',
          claimsFor(userId, 'ESTUDIANTE', 5, 'SYS'),
        ]);
        const d = await c.query<{ id: string }>(
          "INSERT INTO dispositivos (usuario_id, push_token, plataforma) VALUES ($1, 'tok-sistema', 'android') RETURNING id",
          [userId],
        );
        devId = d.rows[0]!.id;
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK');
        c.release();
        throw e;
      }

      try {
        const sys = await pool.connect();
        const r = await sys.query<{ usuario_id: string }>(
          'SELECT usuario_id FROM dispositivos WHERE usuario_id = $1',
          [userId],
        );
        sys.release();
        expect(r.rows).toHaveLength(1);
      } finally {
        await c.query('DELETE FROM dispositivos WHERE id = $1', [devId]);
        await c.query('DELETE FROM usuarios WHERE id = $1', [userId]);
        await c.query('RESET request.jwt.claims');
        c.release();
      }
    });
  });
});
