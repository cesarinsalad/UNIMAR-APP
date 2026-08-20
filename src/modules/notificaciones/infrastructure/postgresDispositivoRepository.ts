import type { DbTx } from '../../../shared/kernel/db';
import type { Dispositivo, Plataforma } from '../domain/dispositivo';
import type { IDispositivoRepository } from '../domain/ports';

interface DispositivoRow {
  id: string;
  usuario_id: string;
  push_token: string;
  plataforma: Plataforma;
  registrado_at: Date;
  ultimo_uso_at: Date | null;
}

function mapRow(row: DispositivoRow): Dispositivo {
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    pushToken: row.push_token,
    plataforma: row.plataforma,
    registradoAt: row.registrado_at,
    ultimoUsoAt: row.ultimo_uso_at,
  };
}

/**
 * Implementación de IDispositivoRepository sobre PostgreSQL.
 *
 * El `upsert` cubre los dos escenarios esperados:
 *  - Token nuevo para un usuario: INSERT simple.
 *  - Reinstalación de la app en otro dispositivo del mismo usuario: el mismo
 *    `push_token` se re-asigna al usuario actualizando `ultimo_uso_at` y
 *    `plataforma` (idempotente, soporta claves distintas de Expo al rotar).
 *
 * El `WHERE dispositivos.usuario_id = EXCLUDED.usuario_id` del DO UPDATE
 * combinado con la política RLS (UPDATE solo permite filas propias) garantiza
 * que un token asignado a OTRO usuario no se roba: el conflicto se detecta,
 * la cláusula WHERE no aplica, y RLS esconde la fila ajena. Resultado: 0
 * filas en `RETURNING` → la capa HTTP traduce a 409.
 */
export class PostgresDispositivoRepository implements IDispositivoRepository {
  async upsert(
    tx: DbTx,
    input: { usuarioId: string; pushToken: string; plataforma: Plataforma },
  ): Promise<Dispositivo | null> {
    const result = await tx.query<DispositivoRow>(
      `INSERT INTO dispositivos (usuario_id, push_token, plataforma)
       VALUES ($1, $2, $3)
       ON CONFLICT (push_token) DO UPDATE
         SET plataforma = EXCLUDED.plataforma,
             ultimo_uso_at = now()
         WHERE dispositivos.usuario_id = EXCLUDED.usuario_id
       RETURNING id, usuario_id, push_token, plataforma, registrado_at, ultimo_uso_at`,
      [input.usuarioId, input.pushToken, input.plataforma],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async listarPorUsuario(tx: DbTx, usuarioId: string): Promise<Dispositivo[]> {
    const result = await tx.query<DispositivoRow>(
      `SELECT id, usuario_id, push_token, plataforma, registrado_at, ultimo_uso_at
         FROM dispositivos
        WHERE usuario_id = $1
        ORDER BY registrado_at DESC`,
      [usuarioId],
    );
    return result.rows.map(mapRow);
  }

  async eliminar(tx: DbTx, id: string): Promise<boolean> {
    const result = await tx.query<{ id: string }>(
      'DELETE FROM dispositivos WHERE id = $1 RETURNING id',
      [id],
    );
    return result.rows.length > 0;
  }
}
