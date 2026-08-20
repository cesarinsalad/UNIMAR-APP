import type { DbTx } from '../../../shared/kernel/db';
import type { Notificacion, TipoNotificacion } from '../domain/notificacion';
import type { INotificacionRepository } from '../domain/ports';

interface NotificacionRow {
  id: string;
  usuario_id: string;
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo: string;
  referencia_id: string | null;
  leida: boolean;
  created_at: Date;
}

function mapRow(row: NotificacionRow): Notificacion {
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    tipo: row.tipo,
    titulo: row.titulo,
    cuerpo: row.cuerpo,
    referenciaId: row.referencia_id,
    leida: row.leida,
    createdAt: row.created_at,
  };
}

/**
 * Implementación de INotificacionRepository sobre PostgreSQL.
 *
 * Disciplina de transacción: cada método recibe un `DbTx` explícito porque la
 * política RLS evalúa los claims del usuario autenticado dentro del UnitOfWork
 * del BFF (nunca fuera de él). Los datos se mapean de snake_case (DB) a
 * camelCase (dominio). El fan-out de insert masivo se añade en el Paso 3 — C3.
 */
export class PostgresNotificacionRepository implements INotificacionRepository {
  async listar(
    tx: DbTx,
    filtro: { soloNoLeidas: boolean; limit: number; offset: number },
  ): Promise<Notificacion[]> {
    const where = filtro.soloNoLeidas ? 'WHERE leida = false' : '';
    const result = await tx.query<NotificacionRow>(
      `SELECT id, usuario_id, tipo, titulo, cuerpo, referencia_id, leida, created_at
         FROM notificaciones
         ${where}
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
      [filtro.limit, filtro.offset],
    );
    return result.rows.map(mapRow);
  }

  async contarNoLeidas(tx: DbTx): Promise<number> {
    const result = await tx.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM notificaciones WHERE leida = false',
    );
    return result.rows[0]?.n ?? 0;
  }

  async marcarLeida(tx: DbTx, id: string): Promise<Notificacion | null> {
    const result = await tx.query<NotificacionRow>(
      `UPDATE notificaciones
          SET leida = true
        WHERE id = $1
        RETURNING id, usuario_id, tipo, titulo, cuerpo, referencia_id, leida, created_at`,
      [id],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async marcarTodasLeidas(tx: DbTx): Promise<number> {
    const result = await tx.query(
      'UPDATE notificaciones SET leida = true WHERE leida = false',
    );
    return result.rowCount ?? 0;
  }
}
