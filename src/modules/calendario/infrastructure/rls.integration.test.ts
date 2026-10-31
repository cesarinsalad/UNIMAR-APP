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
  com3: string;
  est5: string;
  est3: string;
}

interface TestEventos {
  personalEst: string;
  oficialCom5: string;
  oficialAdminGlobal: string;
  oficialAdmin5: string;
}

/**
 * Integración de RLS para el componente Calendario.
 *
 * Evidencia ejecutable del modelo ABAC del Paso 4:
 *  - eventos SELECT: ADMIN todo, PERSONAL propio, OFICIAL por audiencia.
 *  - eventos INSERT: PERSONAL propio; OFICIAL solo ADMIN/COMUNICADOR.
 *  - eventos UPDATE/DELETE: PERSONAL propio; OFICIAL ADMIN o dueño COM.
 *  - evento_audiencias: INSERT solo ADMIN o COM con decanato propio.
 *  - evento_recordatorios_enviados: solo sistema (sin claims).
 *
 * Patrón: transacción manual con ROLLBACK al final para no dejar datos.
 */
describe.skipIf(!RUN_DB_TESTS)('RLS Calendario (ABAC)', () => {
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
    const com3 = await client.query<{ id: string }>(
      "INSERT INTO usuarios (cedula, nombre, email, rol_id, decanato_id) VALUES ($1, 'COM 3', $2, (SELECT id FROM roles WHERE nombre='COMUNICADOR'), 3) RETURNING id",
      [`TEST-${ts}-C3`, `com3-${ts}@test.ve`],
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
      com3: com3.rows[0]!.id,
      est5: est5.rows[0]!.id,
      est3: est3.rows[0]!.id,
    };
  }

  async function seedEventos(
    client: PoolClient,
    u: TestUsuarios,
  ): Promise<TestEventos> {
    // PERSONAL del estudiante 5
    await setClaims(client, claimsFor(u.est5, 'ESTUDIANTE', 5, 'EST5'));
    const personalEst = await client.query<{ id: string }>(
      "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('Personal', 'PERSONAL', $1, now() + interval '1 day') RETURNING id",
      [u.est5],
    );

    // OFICIAL del comunicador 5 (audiencia [5])
    await setClaims(client, claimsFor(u.com5, 'COMUNICADOR', 5, 'COM5'));
    const oficialCom5 = await client.query<{ id: string }>(
      "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('Reunion Decanato 5', 'OFICIAL', $1, now() + interval '2 day') RETURNING id",
      [u.com5],
    );
    await client.query(
      'INSERT INTO evento_audiencias (evento_id, decanato_id) VALUES ($1, 5)',
      [oficialCom5.rows[0]!.id],
    );

    // OFICIAL del ADMIN GLOBAL
    await setClaims(client, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));
    const oficialAdminGlobal = await client.query<{ id: string }>(
      "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('Conferencia Global', 'OFICIAL', $1, now() + interval '3 day') RETURNING id",
      [u.adminId],
    );

    // OFICIAL del ADMIN audiencia [5]
    const oficialAdmin5 = await client.query<{ id: string }>(
      "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('Charla Decanato 5', 'OFICIAL', $1, now() + interval '4 day') RETURNING id",
      [u.adminId],
    );
    await client.query(
      'INSERT INTO evento_audiencias (evento_id, decanato_id) VALUES ($1, 5)',
      [oficialAdmin5.rows[0]!.id],
    );

    return {
      personalEst: personalEst.rows[0]!.id,
      oficialCom5: oficialCom5.rows[0]!.id,
      oficialAdminGlobal: oficialAdminGlobal.rows[0]!.id,
      oficialAdmin5: oficialAdmin5.rows[0]!.id,
    };
  }

  // ──────────────────────────────────────────────────────────
  // eventos: SELECT
  // ──────────────────────────────────────────────────────────
  describe('eventos SELECT', () => {
    it('ADMIN ve todos los eventos independientemente de tipo y audiencia', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const evs = await seedEventos(c, u);
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));

        const result = await c.query<{ id: string }>('SELECT id FROM eventos ORDER BY titulo');
        const ids = result.rows.map((r) => r.id);
        expect(ids).toContain(evs.personalEst);
        expect(ids).toContain(evs.oficialCom5);
        expect(ids).toContain(evs.oficialAdminGlobal);
        expect(ids).toContain(evs.oficialAdmin5);
      });
    });

    it('ESTUDIANTE solo ve su propio PERSONAL y OFICIALes de su audiencia/GLOBAL', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const evs = await seedEventos(c, u);
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'EST5'));

        const result = await c.query<{ id: string }>('SELECT id FROM eventos');
        const ids = result.rows.map((r) => r.id);
        expect(ids).toContain(evs.personalEst);
        expect(ids).toContain(evs.oficialCom5); // audiencia [5]
        expect(ids).toContain(evs.oficialAdminGlobal); // GLOBAL
        expect(ids).toContain(evs.oficialAdmin5); // audiencia [5]
      });
    });

    it('ESTUDIANTE de otro decanato no ve OFICIALes del decanato 5', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const evs = await seedEventos(c, u);
        await setClaims(c, claimsFor(u.est3, 'ESTUDIANTE', 3, 'EST3'));

        const result = await c.query<{ id: string }>('SELECT id FROM eventos');
        const ids = result.rows.map((r) => r.id);
        expect(ids).toContain(evs.oficialAdminGlobal); // GLOBAL
        expect(ids).not.toContain(evs.oficialCom5); // audiencia [5]
        expect(ids).not.toContain(evs.oficialAdmin5); // audiencia [5]
        expect(ids).not.toContain(evs.personalEst); // PERSONAL ajeno
      });
    });

    it('ESTUDIANTE no ve PERSONAL de otro usuario', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const evs = await seedEventos(c, u);
        await setClaims(c, claimsFor(u.est3, 'ESTUDIANTE', 3, 'EST3'));

        const result = await c.query<{ id: string }>(
          "SELECT id FROM eventos WHERE tipo = 'PERSONAL'",
        );
        expect(result.rows.map((r) => r.id)).not.toContain(evs.personalEst);
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  // eventos: INSERT
  // ──────────────────────────────────────────────────────────
  describe('eventos INSERT', () => {
    it('ESTUDIANTE inserta PERSONAL con usuario_id = claims.sub OK', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'EST5'));

        const result = await c.query<{ id: string }>(
          "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('t', 'PERSONAL', $1, now() + interval '1 day') RETURNING id",
          [u.est5],
        );
        expect(result.rows[0]!.id).toBeDefined();
      });
    });

    it('ESTUDIANTE intenta insertar PERSONAL con usuario_id ajeno -> 42501', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'EST5'));

        await expect(
          c.query(
            "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('t', 'PERSONAL', $1, now() + interval '1 day')",
            [u.est3],
          ),
        ).rejects.toMatchObject({ code: '42501' });
      });
    });

    it('ESTUDIANTE intenta insertar OFICIAL -> 42501', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'EST5'));

        await expect(
          c.query(
            "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('t', 'OFICIAL', $1, now() + interval '1 day')",
            [u.est5],
          ),
        ).rejects.toMatchObject({ code: '42501' });
      });
    });

    it('COMUNICADOR inserta OFICIAL con usuario_id = claims.sub OK', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.com5, 'COMUNICADOR', 5, 'COM5'));

        const result = await c.query<{ id: string }>(
          "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('t', 'OFICIAL', $1, now() + interval '1 day') RETURNING id",
          [u.com5],
        );
        expect(result.rows[0]!.id).toBeDefined();
      });
    });

    it('ADMIN inserta OFICIAL OK', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));

        const result = await c.query<{ id: string }>(
          "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('t', 'OFICIAL', $1, now() + interval '1 day') RETURNING id",
          [u.adminId],
        );
        expect(result.rows[0]!.id).toBeDefined();
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  // evento_audiencias: INSERT
  // ──────────────────────────────────────────────────────────
  describe('evento_audiencias INSERT', () => {
    it('COMUNICADOR inserta audiencia de su propio decanato OK', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));
        const ev = await c.query<{ id: string }>(
          "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('t', 'OFICIAL', $1, now() + interval '1 day') RETURNING id",
          [u.adminId],
        );
        await setClaims(c, claimsFor(u.com5, 'COMUNICADOR', 5, 'COM5'));

        const result = await c.query(
          'INSERT INTO evento_audiencias (evento_id, decanato_id) VALUES ($1, 5)',
          [ev.rows[0]!.id],
        );
        expect(result.rowCount).toBe(1);
      });
    });

    it('COMUNICADOR intenta audiencia de otro decanato -> 42501', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));
        const ev = await c.query<{ id: string }>(
          "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('t', 'OFICIAL', $1, now() + interval '1 day') RETURNING id",
          [u.adminId],
        );
        await setClaims(c, claimsFor(u.com5, 'COMUNICADOR', 5, 'COM5'));

        await expect(
          c.query('INSERT INTO evento_audiencias (evento_id, decanato_id) VALUES ($1, 3)', [
            ev.rows[0]!.id,
          ]),
        ).rejects.toMatchObject({ code: '42501' });
      });
    });

    it('ADMIN inserta audiencia de cualquier decanato OK', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));
        const ev = await c.query<{ id: string }>(
          "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('t', 'OFICIAL', $1, now() + interval '1 day') RETURNING id",
          [u.adminId],
        );

        const result = await c.query(
          'INSERT INTO evento_audiencias (evento_id, decanato_id) VALUES ($1, 3)',
          [ev.rows[0]!.id],
        );
        expect(result.rowCount).toBe(1);
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  // eventos: UPDATE / DELETE
  // ──────────────────────────────────────────────────────────
  describe('eventos UPDATE/DELETE', () => {
    it('dueño actualiza su PERSONAL OK', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const evs = await seedEventos(c, u);
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'EST5'));

        const result = await c.query(
          "UPDATE eventos SET titulo = 'nuevo' WHERE id = $1",
          [evs.personalEst],
        );
        expect(result.rowCount).toBe(1);
      });
    });

    it('ESTUDIANTE intenta actualizar PERSONAL ajeno -> 0 filas', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const evs = await seedEventos(c, u);
        await setClaims(c, claimsFor(u.est3, 'ESTUDIANTE', 3, 'EST3'));

        const result = await c.query(
          "UPDATE eventos SET titulo = 'hack' WHERE id = $1",
          [evs.personalEst],
        );
        expect(result.rowCount).toBe(0);
      });
    });

    it('COMUNICADOR actualiza su propio OFICIAL OK', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const evs = await seedEventos(c, u);
        await setClaims(c, claimsFor(u.com5, 'COMUNICADOR', 5, 'COM5'));

        const result = await c.query(
          "UPDATE eventos SET titulo = 'actualizado' WHERE id = $1",
          [evs.oficialCom5],
        );
        expect(result.rowCount).toBe(1);
      });
    });

    it('COMUNICADOR ajeno intenta actualizar OFICIAL -> 0 filas', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const evs = await seedEventos(c, u);
        await setClaims(c, claimsFor(u.com3, 'COMUNICADOR', 3, 'COM3'));

        const result = await c.query(
          "UPDATE eventos SET titulo = 'hack' WHERE id = $1",
          [evs.oficialCom5],
        );
        expect(result.rowCount).toBe(0);
      });
    });

    it('ADMIN actualiza cualquier OFICIAL OK', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const evs = await seedEventos(c, u);
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));

        const result = await c.query(
          "UPDATE eventos SET titulo = 'admin-edit' WHERE id = $1",
          [evs.oficialCom5],
        );
        expect(result.rowCount).toBe(1);
      });
    });

    it('dueño elimina su PERSONAL OK', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const evs = await seedEventos(c, u);
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'EST5'));

        const result = await c.query('DELETE FROM eventos WHERE id = $1', [
          evs.personalEst,
        ]);
        expect(result.rowCount).toBe(1);
      });
    });

    it('COMUNICADOR elimina su OFICIAL OK', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const evs = await seedEventos(c, u);
        await setClaims(c, claimsFor(u.com5, 'COMUNICADOR', 5, 'COM5'));

        const result = await c.query('DELETE FROM eventos WHERE id = $1', [
          evs.oficialCom5,
        ]);
        expect(result.rowCount).toBe(1);
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  // INSTITUCIONAL: visible a todos; solo ADMIN escribe
  // ──────────────────────────────────────────────────────────
  describe('eventos INSTITUCIONAL', () => {
    it('ESTUDIANTE de otro decanato ve el INSTITUCIONAL (visible a todos)', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));
        const inst = await c.query<{ id: string }>(
          "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('Inicio de inscripciones', 'INSTITUCIONAL', $1, now() + interval '10 day') RETURNING id",
          [u.adminId],
        );
        const instId = inst.rows[0]!.id;

        await setClaims(c, claimsFor(u.est3, 'ESTUDIANTE', 3, 'EST3'));
        const result = await c.query<{ id: string }>(
          "SELECT id FROM eventos WHERE tipo = 'INSTITUCIONAL'",
        );
        expect(result.rows.map((r) => r.id)).toContain(instId);
      });
    });

    it('ESTUDIANTE intenta insertar INSTITUCIONAL -> 42501', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'EST5'));
        await expect(
          c.query(
            "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('t', 'INSTITUCIONAL', $1, now() + interval '1 day')",
            [u.est5],
          ),
        ).rejects.toMatchObject({ code: '42501' });
      });
    });

    it('COMUNICADOR intenta insertar INSTITUCIONAL -> 42501', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.com5, 'COMUNICADOR', 5, 'COM5'));
        await expect(
          c.query(
            "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('t', 'INSTITUCIONAL', $1, now() + interval '1 day')",
            [u.com5],
          ),
        ).rejects.toMatchObject({ code: '42501' });
      });
    });

    it('ADMIN inserta INSTITUCIONAL OK', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));
        const result = await c.query<{ id: string }>(
          "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('t', 'INSTITUCIONAL', $1, now() + interval '1 day') RETURNING id",
          [u.adminId],
        );
        expect(result.rows[0]!.id).toBeDefined();
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  // FERIADO: mismo régimen RLS que INSTITUCIONAL
  // ──────────────────────────────────────────────────────────
  describe('eventos FERIADO', () => {
    it('ESTUDIANTE de otro decanato ve el FERIADO (visible a todos)', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));
        const fer = await c.query<{ id: string }>(
          "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('Receso de Semana Santa', 'FERIADO', $1, now() + interval '10 day') RETURNING id",
          [u.adminId],
        );
        const ferId = fer.rows[0]!.id;

        await setClaims(c, claimsFor(u.est3, 'ESTUDIANTE', 3, 'EST3'));
        const result = await c.query<{ id: string }>(
          "SELECT id FROM eventos WHERE tipo = 'FERIADO'",
        );
        expect(result.rows.map((r) => r.id)).toContain(ferId);
      });
    });

    it('ESTUDIANTE intenta insertar FERIADO -> 42501', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'EST5'));
        await expect(
          c.query(
            "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('t', 'FERIADO', $1, now() + interval '1 day')",
            [u.est5],
          ),
        ).rejects.toMatchObject({ code: '42501' });
      });
    });

    it('COMUNICADOR intenta insertar FERIADO -> 42501', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.com5, 'COMUNICADOR', 5, 'COM5'));
        await expect(
          c.query(
            "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('t', 'FERIADO', $1, now() + interval '1 day')",
            [u.com5],
          ),
        ).rejects.toMatchObject({ code: '42501' });
      });
    });

    it('ADMIN inserta FERIADO OK', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));
        const result = await c.query<{ id: string }>(
          "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('t', 'FERIADO', $1, now() + interval '1 day') RETURNING id",
          [u.adminId],
        );
        expect(result.rows[0]!.id).toBeDefined();
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  // evento_participantes: pivot "agregar a mi agenda"
  // ──────────────────────────────────────────────────────────
  describe('evento_participantes', () => {
    it('usuario inserta su propia participación OK', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));
        const ev = await c.query<{ id: string }>(
          "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('t', 'OFICIAL', $1, now() + interval '1 day') RETURNING id",
          [u.adminId],
        );
        const evId = ev.rows[0]!.id;

        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'EST5'));
        // El evento es GLOBAL, el ESTUDIANTE lo ve (RLS eventos Select) y
        // RLS de participantes le permite insertar SU fila.
        const result = await c.query(
          'INSERT INTO evento_participantes (evento_id, usuario_id) VALUES ($1, $2)',
          [evId, u.est5],
        );
        expect(result.rowCount).toBe(1);
      });
    });

    it('usuario intenta insertar participación ajena -> 42501', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));
        const ev = await c.query<{ id: string }>(
          "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('t', 'OFICIAL', $1, now() + interval '1 day') RETURNING id",
          [u.adminId],
        );
        const evId = ev.rows[0]!.id;

        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'EST5'));
        await expect(
          c.query('INSERT INTO evento_participantes (evento_id, usuario_id) VALUES ($1, $2)', [
            evId,
            u.est3,
          ]),
        ).rejects.toMatchObject({ code: '42501' });
      });
    });

    it('SELECT: solo ve sus propias filas (ADMIN ve todas)', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));
        const ev = await c.query<{ id: string }>(
          "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('t', 'OFICIAL', $1, now() + interval '1 day') RETURNING id",
          [u.adminId],
        );
        const evId = ev.rows[0]!.id;
        // Cada usuario inserta SU participación (RLS lo exige también aquí).
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));
        await c.query('INSERT INTO evento_participantes (evento_id, usuario_id) VALUES ($1, $2)', [
          evId,
          u.adminId,
        ]);
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'EST5'));
        await c.query('INSERT INTO evento_participantes (evento_id, usuario_id) VALUES ($1, $2)', [
          evId,
          u.est5,
        ]);

        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'EST5'));
        const r = await c.query<{ usuario_id: string }>('SELECT usuario_id FROM evento_participantes');
        expect(r.rows.map((row) => row.usuario_id)).toEqual([u.est5]);

        await setClaims(c, claimsFor(u.est3, 'ESTUDIANTE', 3, 'EST3'));
        const r2 = await c.query<{ usuario_id: string }>('SELECT usuario_id FROM evento_participantes');
        expect(r2.rows).toHaveLength(0);
      });
    });

    it('DELETE: solo sus propias filas; fila ajena -> 0 filas', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));
        const ev = await c.query<{ id: string }>(
          "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('t', 'OFICIAL', $1, now() + interval '1 day') RETURNING id",
          [u.adminId],
        );
        const evId = ev.rows[0]!.id;
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'EST5'));
        await c.query('INSERT INTO evento_participantes (evento_id, usuario_id) VALUES ($1, $2)', [
          evId,
          u.est5,
        ]);

        await setClaims(c, claimsFor(u.est3, 'ESTUDIANTE', 3, 'EST3'));
        const r = await c.query('DELETE FROM evento_participantes WHERE evento_id = $1', [evId]);
        expect(r.rowCount).toBe(0);

        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'EST5'));
        const r2 = await c.query('DELETE FROM evento_participantes WHERE evento_id = $1', [evId]);
        expect(r2.rowCount).toBe(1);
      });
    });

    it('la participación cuelga por FK: borrar el evento elimina sus filas (cascada)', async () => {
      // Evidencia de ON DELETE CASCADE: eliminar el evento elimina las
      // participaciones (dependencia referencial base, indistinto del tipo).
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));
        const ev = await c.query<{ id: string }>(
          "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('t', 'OFICIAL', $1, now() + interval '1 day') RETURNING id",
          [u.adminId],
        );
        const evId = ev.rows[0]!.id;
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'EST5'));
        await c.query('INSERT INTO evento_participantes (evento_id, usuario_id) VALUES ($1, $2)', [
          evId,
          u.est5,
        ]);
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));
        await c.query('DELETE FROM eventos WHERE id = $1', [evId]);
        const r = await c.query<{ n: number }>(
          'SELECT count(*)::int AS n FROM evento_participantes',
        );
        expect(r.rows[0]!.n).toBe(0);
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  // evento_recordatorios_enviados: solo sistema
  // ──────────────────────────────────────────────────────────
  describe('evento_recordatorios_enviados', () => {
    it('bajo claims: SELECT devuelve 0 filas (fail-closed)', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));

        const result = await c.query('SELECT count(*)::int AS n FROM evento_recordatorios_enviados');
        expect(result.rows[0]!.n).toBe(0);
      });
    });

    it('bajo claims: INSERT -> 42501 (política de sistema)', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));
        const evs = await seedEventos(c, u);

        await expect(
          c.query(
            'INSERT INTO evento_recordatorios_enviados (evento_id, usuario_id) VALUES ($1, $2)',
            [evs.oficialAdminGlobal, u.est5],
          ),
        ).rejects.toMatchObject({ code: '42501' });
      });
    });

    it('en modo sistema: INSERT y SELECT funcionan', async () => {
      // Similar al patrón del test de `dispositivos_select_sistema`: commiteamos
      // los datos necesarios y releemos desde una conexión limpia (donde
      // `request.jwt.claims` es NULL).
      const ts = Date.now();
      const c = await pool.connect();
      let userId!: string;
      let evId!: string;
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
        const e = await c.query<{ id: string }>(
          "INSERT INTO eventos (titulo, tipo, usuario_id, inicio_at) VALUES ('sys', 'PERSONAL', $1, now() + interval '1 day') RETURNING id",
          [userId],
        );
        evId = e.rows[0]!.id;
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK');
        c.release();
        throw e;
      }

      try {
        const sys = await pool.connect();
        // INSERT en modo sistema
        await sys.query(
          'INSERT INTO evento_recordatorios_enviados (evento_id, usuario_id) VALUES ($1, $2)',
          [evId, userId],
        );
        // SELECT en modo sistema: debe ver la fila
        const r = await sys.query<{ count: string }>(
          'SELECT count(*)::int AS count FROM evento_recordatorios_enviados WHERE evento_id = $1',
          [evId],
        );
        sys.release();
        expect(r.rows[0]!.count).toBe(1);
      } finally {
        await c.query('DELETE FROM evento_recordatorios_enviados WHERE evento_id = $1', [evId]);
        await c.query('DELETE FROM eventos WHERE id = $1', [evId]);
        await c.query('DELETE FROM usuarios WHERE id = $1', [userId]);
        await c.query('RESET request.jwt.claims');
        c.release();
      }
    });
  });
});
