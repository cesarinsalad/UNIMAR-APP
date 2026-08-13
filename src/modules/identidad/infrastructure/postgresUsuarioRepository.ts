import type { DbTx } from '../../../shared/kernel/db';
import type { IUsuarioRepository, PerfilUniversitario, Usuario } from '../domain/ports';

interface UsuarioRow {
  id: string;
  cedula: string;
  nombre: string;
  rol_nombre: string;
  decanato_id: number | null;
  preferencias: Record<string, unknown>;
}

/**
 * Implementación de IUsuarioRepository sobre PostgreSQL.
 *
 * Detalle clave del upsert: `ON CONFLICT (cedula) DO UPDATE` actualiza nombre,
 * decanato y email, pero **nunca toca `rol_id`**. Los roles COMUNICADOR/ADMIN
 * solo los asigna el sistema (seed o administración); la API de la universidad
 * no tiene por qué conocer los roles internos de la app, así que un login no
 * puede "bajar" ni "subir" de rol a nadie.
 */
export class PostgresUsuarioRepository implements IUsuarioRepository {
  async upsertDesdePerfil(tx: DbTx, perfil: PerfilUniversitario): Promise<Usuario> {
    const result = await tx.query<UsuarioRow>(
      `
      INSERT INTO usuarios (cedula, nombre, decanato_id, email, rol_id)
      VALUES ($1, $2, $3, $4, (SELECT id FROM roles WHERE nombre = 'ESTUDIANTE'))
      ON CONFLICT (cedula) DO UPDATE
        SET nombre = EXCLUDED.nombre,
            decanato_id = EXCLUDED.decanato_id,
            email = EXCLUDED.email
      RETURNING
        id,
        cedula,
        nombre,
        (SELECT nombre FROM roles WHERE id = usuarios.rol_id) AS rol_nombre,
        decanato_id,
        preferencias
      `,
      [perfil.cedula, perfil.nombre, perfil.decanatoId, perfil.email ?? null],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('upsertDesdePerfil no devolvió fila');
    }

    return {
      id: row.id,
      cedula: row.cedula,
      nombre: row.nombre,
      rolNombre: row.rol_nombre,
      decanatoId: row.decanato_id,
      preferencias: row.preferencias,
    };
  }
}
