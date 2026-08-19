import 'dotenv/config';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { Pool, type PoolClient } from 'pg';

const RUN_DB_TESTS = process.env.RUN_DB_TESTS === '1';
const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://app_bff:app_bff_dev_password@localhost:54322/postgres';

function claimsFor(userId: string, role: 'ADMIN' | 'COMUNICADOR' | 'ESTUDIANTE', decanatoId: number | null, nombre: string) {
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

interface TestComunicados {
  borrador5: string;
  publicado5: string;
  publicado3: string;
  publicadoGlobal: string;
}

/**
 * Integración de RLS para el componente Comunicaciones.
 *
 * Evidencia ejecutable del modelo ABAC:
 * - comunicados: SELECT por audiencia/estado, INSERT con autor=claims.sub, UPDATE solo autor/ADMIN
 * - comunicado_audiencias: INSERT con decanato permitido, DELETE autor/ADMIN
 * - comunicado_adjuntos: SELECT hereda del comunicado, INSERT solo autor/ADMIN, DELETE autor/ADMIN
 * - comunicado_lecturas: INSERT solo propias, SELECT autor/ADMIN/propias
 *
 * Se saltan salvo que se pase RUN_DB_TESTS=1, para que `npm test` no dependa de Docker.
 *
 * Patrón: transacción manual con ROLLBACK al final para no dejar datos de prueba.
 * uow.runAs no sirve aquí porque toma una NUEVA conexión del pool y no vería
 * las filas insertadas en esta transacción.
 */
describe.skipIf(!RUN_DB_TESTS)('RLS Comunicaciones (ABAC)', () => {
  let pool: Pool;

  beforeAll(() => {
    pool = new Pool({ connectionString: DATABASE_URL });
  });

  afterAll(async () => {
    await pool.end();
  });

  // Helper que abre una transacción, ejecuta `fn` con un cliente que ya tiene
  // RLS activa, y hace ROLLBACK al final.
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

  // Helper que crea los usuarios de prueba y devuelve sus IDs.
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

  // Helper que crea comunicados de prueba con diferentes audiencias y estados.
  // Alterna claims entre COMUNICADOR (para insertar comunicados como el autor)
  // y ADMIN (para insertar audiencias de otro decanato).
  async function seedComunicados(
    client: PoolClient,
    u: TestUsuarios,
  ): Promise<TestComunicados> {
    // Insertar comunicados como el comunicador autor (claims.sub = autor_id)
    await setClaims(client, claimsFor(u.com5, 'COMUNICADOR', 5, 'COM5'));

    // BORRADOR del comunicador de decanato 5
    const borrador5 = await client.query<{ id: string }>(
      'INSERT INTO comunicados (titulo, cuerpo, autor_id, estado) VALUES ($1, $2, $3, $4) RETURNING id',
      ['Borrador 5', 'c', u.com5, 'BORRADOR'],
    );
    await client.query(
      'INSERT INTO comunicado_audiencias (comunicado_id, decanato_id) VALUES ($1, 5)',
      [borrador5.rows[0]!.id],
    );

    // PUBLICADO del comunicador de decanato 5 con audiencia [5]
    const publicado5 = await client.query<{ id: string }>(
      'INSERT INTO comunicados (titulo, cuerpo, autor_id, estado) VALUES ($1, $2, $3, $4) RETURNING id',
      ['Publicado 5', 'c', u.com5, 'PUBLICADO'],
    );
    await client.query(
      'INSERT INTO comunicado_audiencias (comunicado_id, decanato_id) VALUES ($1, 5)',
      [publicado5.rows[0]!.id],
    );

    // PUBLICADO del comunicador de decanato 3 con audiencia [3]
    await setClaims(client, claimsFor(u.com3, 'COMUNICADOR', 3, 'COM3'));
    const publicado3 = await client.query<{ id: string }>(
      'INSERT INTO comunicados (titulo, cuerpo, autor_id, estado) VALUES ($1, $2, $3, $4) RETURNING id',
      ['Publicado 3', 'c', u.com3, 'PUBLICADO'],
    );
    await client.query(
      'INSERT INTO comunicado_audiencias (comunicado_id, decanato_id) VALUES ($1, 3)',
      [publicado3.rows[0]!.id],
    );

    // PUBLICADO GLOBAL (sin audiencias) - como ADMIN porque comunicador no puede crear GLOBAL
    await setClaims(client, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));
    const publicadoGlobal = await client.query<{ id: string }>(
      'INSERT INTO comunicados (titulo, cuerpo, autor_id, estado) VALUES ($1, $2, $3, $4) RETURNING id',
      ['Global', 'c', u.adminId, 'PUBLICADO'],
    );

    return {
      borrador5: borrador5.rows[0]!.id,
      publicado5: publicado5.rows[0]!.id,
      publicado3: publicado3.rows[0]!.id,
      publicadoGlobal: publicadoGlobal.rows[0]!.id,
    };
  }

  // ──────────────────────────────────────────────────────────
  // comunicados: SELECT
  // ──────────────────────────────────────────────────────────
  describe('comunicados SELECT', () => {
    it('ADMIN ve todos los comunicados independientemente de estado y audiencia', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));

        const result = await c.query<{ id: string }>('SELECT id FROM comunicados ORDER BY titulo');
        const ids = result.rows.map((r) => r.id);
        expect(ids).toContain(coms.borrador5);
        expect(ids).toContain(coms.publicado5);
        expect(ids).toContain(coms.publicado3);
        expect(ids).toContain(coms.publicadoGlobal);
      });
    });

    it('Autor ve sus comunicados en cualquier estado', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        await setClaims(c, claimsFor(u.com5, 'COMUNICADOR', 5, 'COM5'));

        const result = await c.query<{ id: string }>(
          "SELECT id FROM comunicados WHERE autor_id = $1",
          [u.com5],
        );
        const ids = result.rows.map((r) => r.id);
        expect(ids).toContain(coms.borrador5);
        expect(ids).toContain(coms.publicado5);
      });
    });

    it('ESTUDIANTE decanato 5 ve PUBLICADO de su decanato y GLOBAL, pero no BORRADOR ni otro decanato', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'Est5'));

        const result = await c.query<{ id: string }>('SELECT id FROM comunicados ORDER BY titulo');
        const ids = result.rows.map((r) => r.id);
        expect(ids).toContain(coms.publicado5);
        expect(ids).toContain(coms.publicadoGlobal);
        expect(ids).not.toContain(coms.borrador5);
        expect(ids).not.toContain(coms.publicado3);
      });
    });

    it('ESTUDIANTE decanato 3 ve PUBLICADO de su decanato y GLOBAL, pero no decanato 5', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        await setClaims(c, claimsFor(u.est3, 'ESTUDIANTE', 3, 'Est3'));

        const result = await c.query<{ id: string }>('SELECT id FROM comunicados');
        const ids = result.rows.map((r) => r.id);
        expect(ids).toContain(coms.publicado3);
        expect(ids).toContain(coms.publicadoGlobal);
        expect(ids).not.toContain(coms.publicado5);
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  // comunicados: INSERT
  // ──────────────────────────────────────────────────────────
  describe('comunicados INSERT', () => {
    it('COMUNICADOR inserta con autor_id = claims.sub OK', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.com5, 'COMUNICADOR', 5, 'COM5'));

        const result = await c.query<{ id: string }>(
          "INSERT INTO comunicados (titulo, cuerpo, autor_id, estado) VALUES ('t', 'c', $1, 'BORRADOR') RETURNING id",
          [u.com5],
        );
        expect(result.rows[0]!.id).toBeDefined();
      });
    });

    it('COMUNICADOR con autor_id != claims.sub -> error 42501', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.com5, 'COMUNICADOR', 5, 'COM5'));

        await expect(
          c.query(
            "INSERT INTO comunicados (titulo, cuerpo, autor_id, estado) VALUES ('t', 'c', $1, 'BORRADOR')",
            [u.adminId],
          ),
        ).rejects.toMatchObject({ code: '42501' });
      });
    });

    it('ESTUDIANTE intenta insertar -> error 42501', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'Est5'));

        await expect(
          c.query(
            "INSERT INTO comunicados (titulo, cuerpo, autor_id, estado) VALUES ('t', 'c', $1, 'BORRADOR')",
            [u.est5],
          ),
        ).rejects.toMatchObject({ code: '42501' });
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  // comunicados: UPDATE
  // ──────────────────────────────────────────────────────────
  describe('comunicados UPDATE', () => {
    it('Autor actualiza su comunicado', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        await setClaims(c, claimsFor(u.com5, 'COMUNICADOR', 5, 'COM5'));

        const result = await c.query(
          "UPDATE comunicados SET titulo = 'nuevo' WHERE id = $1",
          [coms.borrador5],
        );
        expect(result.rowCount).toBe(1);
      });
    });

    it('ADMIN actualiza cualquier comunicado', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));

        const result = await c.query(
          "UPDATE comunicados SET titulo = 'admin-edit' WHERE id = $1",
          [coms.borrador5],
        );
        expect(result.rowCount).toBe(1);
      });
    });

    it('COMUNICADOR ajeno intenta actualizar -> 0 filas afectadas', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        // Crear otro comunicador
        const ts = Date.now();
        const other = await c.query<{ id: string }>(
          "INSERT INTO usuarios (cedula, nombre, email, rol_id, decanato_id) VALUES ($1, 'Other', $2, (SELECT id FROM roles WHERE nombre='COMUNICADOR'), 3) RETURNING id",
          [`TEST-${ts}-OTHER`, `other-${ts}@test.ve`],
        );
        const otherId = other.rows[0]!.id;
        await setClaims(c, claimsFor(otherId, 'COMUNICADOR', 3, 'Other'));

        const result = await c.query(
          "UPDATE comunicados SET titulo = 'hack' WHERE id = $1",
          [coms.borrador5],
        );
        expect(result.rowCount).toBe(0);
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  // comunicado_audiencias: INSERT
  // ──────────────────────────────────────────────────────────
  describe('comunicado_audiencias INSERT', () => {
    it('COMUNICADOR inserta audiencia de su propio decanato OK', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        // Eliminar la audiencia del borrador para insertar una nueva
        await c.query('DELETE FROM comunicado_audiencias WHERE comunicado_id = $1', [coms.borrador5]);
        await setClaims(c, claimsFor(u.com5, 'COMUNICADOR', 5, 'COM5'));

        const result = await c.query(
          'INSERT INTO comunicado_audiencias (comunicado_id, decanato_id) VALUES ($1, 5)',
          [coms.borrador5],
        );
        expect(result.rowCount).toBe(1);
      });
    });

    it('COMUNICADOR intenta insertar audiencia de otro decanato -> error 42501', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        await c.query('DELETE FROM comunicado_audiencias WHERE comunicado_id = $1', [coms.borrador5]);
        await setClaims(c, claimsFor(u.com5, 'COMUNICADOR', 5, 'COM5'));

        await expect(
          c.query(
            'INSERT INTO comunicado_audiencias (comunicado_id, decanato_id) VALUES ($1, 3)',
            [coms.borrador5],
          ),
        ).rejects.toMatchObject({ code: '42501' });
      });
    });

    it('ADMIN inserta audiencia de cualquier decanato OK', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        await c.query('DELETE FROM comunicado_audiencias WHERE comunicado_id = $1', [coms.borrador5]);
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));

        const result = await c.query(
          'INSERT INTO comunicado_audiencias (comunicado_id, decanato_id) VALUES ($1, 3)',
          [coms.borrador5],
        );
        expect(result.rowCount).toBe(1);
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  // comunicado_audiencias: DELETE
  // ──────────────────────────────────────────────────────────
  describe('comunicado_audiencias DELETE', () => {
    it('Autor elimina audiencias de su comunicado OK', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        await setClaims(c, claimsFor(u.com5, 'COMUNICADOR', 5, 'COM5'));

        const result = await c.query(
          'DELETE FROM comunicado_audiencias WHERE comunicado_id = $1',
          [coms.borrador5],
        );
        expect(result.rowCount).toBe(1);
      });
    });

    it('ADMIN elimina audiencias de cualquier comunicado OK', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));

        const result = await c.query(
          'DELETE FROM comunicado_audiencias WHERE comunicado_id = $1',
          [coms.borrador5],
        );
        expect(result.rowCount).toBe(1);
      });
    });

    it('COMUNICADOR ajeno intenta eliminar -> 0 filas afectadas', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        const ts = Date.now();
        const other = await c.query<{ id: string }>(
          "INSERT INTO usuarios (cedula, nombre, email, rol_id, decanato_id) VALUES ($1, 'Other', $2, (SELECT id FROM roles WHERE nombre='COMUNICADOR'), 3) RETURNING id",
          [`TEST-${ts}-OTHER`, `other-${ts}@test.ve`],
        );
        const otherId = other.rows[0]!.id;
        await setClaims(c, claimsFor(otherId, 'COMUNICADOR', 3, 'Other'));

        const result = await c.query(
          'DELETE FROM comunicado_audiencias WHERE comunicado_id = $1',
          [coms.borrador5],
        );
        expect(result.rowCount).toBe(0);
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  // comunicado_adjuntos: SELECT
  // ──────────────────────────────────────────────────────────
  describe('comunicado_adjuntos SELECT', () => {
    it('Autor ve adjuntos de su comunicado (cualquier estado)', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        // Insertar un adjunto en el borrador
        await c.query(
          "INSERT INTO comunicado_adjuntos (comunicado_id, storage_path, nombre, mime_type) VALUES ($1, 'path/adj1', 'a.png', 'image/png')",
          [coms.borrador5],
        );
        await setClaims(c, claimsFor(u.com5, 'COMUNICADOR', 5, 'COM5'));

        const result = await c.query<{ id: string }>(
          'SELECT id FROM comunicado_adjuntos WHERE comunicado_id = $1',
          [coms.borrador5],
        );
        expect(result.rows.length).toBe(1);
      });
    });

    it('ADMIN ve todos los adjuntos', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        await c.query(
          "INSERT INTO comunicado_adjuntos (comunicado_id, storage_path, nombre, mime_type) VALUES ($1, 'path/adj1', 'a.png', 'image/png')",
          [coms.borrador5],
        );
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));

        const result = await c.query<{ id: string }>('SELECT id FROM comunicado_adjuntos');
        expect(result.rows.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('ESTUDIANTE ve adjuntos de comunicado PUBLICADO visible', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        await c.query(
          "INSERT INTO comunicado_adjuntos (comunicado_id, storage_path, nombre, mime_type) VALUES ($1, 'path/adj1', 'a.png', 'image/png')",
          [coms.publicado5],
        );
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'Est5'));

        const result = await c.query<{ id: string }>(
          'SELECT id FROM comunicado_adjuntos WHERE comunicado_id = $1',
          [coms.publicado5],
        );
        expect(result.rows.length).toBe(1);
      });
    });

    it('ESTUDIANTE no ve adjuntos de comunicado BORRADOR', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        await c.query(
          "INSERT INTO comunicado_adjuntos (comunicado_id, storage_path, nombre, mime_type) VALUES ($1, 'path/adj1', 'a.png', 'image/png')",
          [coms.borrador5],
        );
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'Est5'));

        const result = await c.query<{ id: string }>(
          'SELECT id FROM comunicado_adjuntos WHERE comunicado_id = $1',
          [coms.borrador5],
        );
        expect(result.rows.length).toBe(0);
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  // comunicado_adjuntos: INSERT
  // ──────────────────────────────────────────────────────────
  describe('comunicado_adjuntos INSERT', () => {
    it('Autor inserta adjunto en su comunicado OK', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        await setClaims(c, claimsFor(u.com5, 'COMUNICADOR', 5, 'COM5'));

        const result = await c.query(
          "INSERT INTO comunicado_adjuntos (comunicado_id, storage_path, nombre, mime_type) VALUES ($1, 'path/adj1', 'a.png', 'image/png')",
          [coms.borrador5],
        );
        expect(result.rowCount).toBe(1);
      });
    });

    it('ADMIN inserta adjunto en cualquier comunicado OK', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));

        const result = await c.query(
          "INSERT INTO comunicado_adjuntos (comunicado_id, storage_path, nombre, mime_type) VALUES ($1, 'path/adj1', 'a.png', 'image/png')",
          [coms.borrador5],
        );
        expect(result.rowCount).toBe(1);
      });
    });

    it('COMUNICADOR ajeno intenta insertar -> error 42501', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        const ts = Date.now();
        const other = await c.query<{ id: string }>(
          "INSERT INTO usuarios (cedula, nombre, email, rol_id, decanato_id) VALUES ($1, 'Other', $2, (SELECT id FROM roles WHERE nombre='COMUNICADOR'), 3) RETURNING id",
          [`TEST-${ts}-OTHER`, `other-${ts}@test.ve`],
        );
        const otherId = other.rows[0]!.id;
        await setClaims(c, claimsFor(otherId, 'COMUNICADOR', 3, 'Other'));

        await expect(
          c.query(
            "INSERT INTO comunicado_adjuntos (comunicado_id, storage_path, nombre, mime_type) VALUES ($1, 'path/adj1', 'a.png', 'image/png')",
            [coms.borrador5],
          ),
        ).rejects.toMatchObject({ code: '42501' });
      });
    });

    it('ESTUDIANTE intenta insertar -> error 42501', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'Est5'));

        await expect(
          c.query(
            "INSERT INTO comunicado_adjuntos (comunicado_id, storage_path, nombre, mime_type) VALUES ($1, 'path/adj1', 'a.png', 'image/png')",
            [coms.borrador5],
          ),
        ).rejects.toMatchObject({ code: '42501' });
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  // comunicado_adjuntos: DELETE
  // ──────────────────────────────────────────────────────────
  describe('comunicado_adjuntos DELETE', () => {
    it('Autor elimina adjunto de su comunicado OK', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        const adj = await c.query<{ id: string }>(
          "INSERT INTO comunicado_adjuntos (comunicado_id, storage_path, nombre, mime_type) VALUES ($1, 'path/adj1', 'a.png', 'image/png') RETURNING id",
          [coms.borrador5],
        );
        await setClaims(c, claimsFor(u.com5, 'COMUNICADOR', 5, 'COM5'));

        const result = await c.query('DELETE FROM comunicado_adjuntos WHERE id = $1', [adj.rows[0]!.id]);
        expect(result.rowCount).toBe(1);
      });
    });

    it('ADMIN elimina adjunto de cualquier comunicado OK', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        const adj = await c.query<{ id: string }>(
          "INSERT INTO comunicado_adjuntos (comunicado_id, storage_path, nombre, mime_type) VALUES ($1, 'path/adj1', 'a.png', 'image/png') RETURNING id",
          [coms.borrador5],
        );
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));

        const result = await c.query('DELETE FROM comunicado_adjuntos WHERE id = $1', [adj.rows[0]!.id]);
        expect(result.rowCount).toBe(1);
      });
    });

    it('COMUNICADOR ajeno intenta eliminar -> 0 filas afectadas', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        const adj = await c.query<{ id: string }>(
          "INSERT INTO comunicado_adjuntos (comunicado_id, storage_path, nombre, mime_type) VALUES ($1, 'path/adj1', 'a.png', 'image/png') RETURNING id",
          [coms.borrador5],
        );
        const ts = Date.now();
        const other = await c.query<{ id: string }>(
          "INSERT INTO usuarios (cedula, nombre, email, rol_id, decanato_id) VALUES ($1, 'Other', $2, (SELECT id FROM roles WHERE nombre='COMUNICADOR'), 3) RETURNING id",
          [`TEST-${ts}-OTHER`, `other-${ts}@test.ve`],
        );
        const otherId = other.rows[0]!.id;
        await setClaims(c, claimsFor(otherId, 'COMUNICADOR', 3, 'Other'));

        const result = await c.query('DELETE FROM comunicado_adjuntos WHERE id = $1', [adj.rows[0]!.id]);
        expect(result.rowCount).toBe(0);
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  // comunicado_lecturas: INSERT
  // ──────────────────────────────────────────────────────────
  describe('comunicado_lecturas INSERT', () => {
    it('ESTUDIANTE inserta lectura propia OK', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'Est5'));

        const result = await c.query(
          'INSERT INTO comunicado_lecturas (comunicado_id, usuario_id) VALUES ($1, $2)',
          [coms.publicado5, u.est5],
        );
        expect(result.rowCount).toBe(1);
      });
    });

    it('ESTUDIANTE intenta insertar lectura de otro -> error 42501', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'Est5'));

        await expect(
          c.query(
            'INSERT INTO comunicado_lecturas (comunicado_id, usuario_id) VALUES ($1, $2)',
            [coms.publicado5, u.est3],
          ),
        ).rejects.toMatchObject({ code: '42501' });
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  // comunicado_lecturas: SELECT
  // ──────────────────────────────────────────────────────────
  describe('comunicado_lecturas SELECT', () => {
    it('Autor ve lecturas de su comunicado', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        // Insertar lectura como est5
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'Est5'));
        await c.query(
          'INSERT INTO comunicado_lecturas (comunicado_id, usuario_id) VALUES ($1, $2)',
          [coms.publicado5, u.est5],
        );
        await setClaims(c, claimsFor(u.com5, 'COMUNICADOR', 5, 'COM5'));

        const result = await c.query(
          'SELECT count(*)::int AS n FROM comunicado_lecturas WHERE comunicado_id = $1',
          [coms.publicado5],
        );
        expect(result.rows[0]!.n).toBe(1);
      });
    });

    it('ADMIN ve lecturas de cualquier comunicado', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        // Insertar lectura como est5 (la política exige usuario_id = claims.sub)
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'Est5'));
        await c.query(
          'INSERT INTO comunicado_lecturas (comunicado_id, usuario_id) VALUES ($1, $2)',
          [coms.publicado5, u.est5],
        );
        await setClaims(c, claimsFor(u.adminId, 'ADMIN', null, 'Admin'));

        const result = await c.query('SELECT count(*)::int AS n FROM comunicado_lecturas');
        expect(result.rows[0]!.n).toBeGreaterThanOrEqual(1);
      });
    });

    it('ESTUDIANTE ve solo sus propias lecturas', async () => {
      await withTx(async (c) => {
        const u = await seedUsuarios(c);
        const coms = await seedComunicados(c, u);
        // Insertar lectura de est5 (como est5)
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'Est5'));
        await c.query(
          'INSERT INTO comunicado_lecturas (comunicado_id, usuario_id) VALUES ($1, $2)',
          [coms.publicado5, u.est5],
        );
        // Insertar lectura de est3 (como est3)
        await setClaims(c, claimsFor(u.est3, 'ESTUDIANTE', 3, 'Est3'));
        await c.query(
          'INSERT INTO comunicado_lecturas (comunicado_id, usuario_id) VALUES ($1, $2)',
          [coms.publicado3, u.est3],
        );
        // Verificar como est5 que solo ve sus propias lecturas
        await setClaims(c, claimsFor(u.est5, 'ESTUDIANTE', 5, 'Est5'));

        const result = await c.query('SELECT usuario_id FROM comunicado_lecturas ORDER BY usuario_id');
        const ids = result.rows.map((r) => r.usuario_id);
        expect(ids).toEqual([u.est5]);
      });
    });
  });
});
