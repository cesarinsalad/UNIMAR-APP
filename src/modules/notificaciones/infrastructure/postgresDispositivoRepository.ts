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
 * El `upsert` no toca directamente la tabla: delega en la función
 * `public.reasignar_dispositivo(text, uuid, text)`, SECURITY DEFINER, que
 * ejecuta el UPSERT bajo privilegios del dueño (postgres). Esa función:
 *  - Requiere `request.jwt.claims` activos (fail-closed en modo sistema).
 *  - Verifica que el `p_usuario_id` coincida con `claims.sub`.
 *  - Reasigna `usuario_id` cuando el `push_token` ya pertenecía a otro
 *    usuario (mismo dispositivo físico, nuevo login).
 *
 * Las políticas RLS de `dispositivos` permanecen intactas (escritura por
 * dueño). Este RPC es el único camino de elevación y solo el rol
 * `app_bff` puede ejecutarlo.
 */
export class PostgresDispositivoRepository implements IDispositivoRepository {
  async upsert(
    tx: DbTx,
    input: { usuarioId: string; pushToken: string; plataforma: Plataforma },
  ): Promise<Dispositivo> {
    const result = await tx.query<DispositivoRow>(
      `SELECT id, usuario_id, push_token, plataforma, registrado_at, ultimo_uso_at
         FROM public.reasignar_dispositivo($1, $2, $3)`,
      [input.usuarioId, input.pushToken, input.plataforma],
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error('reasignar_dispositivo no devolvió fila');
    }
    return mapRow(row);
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

  async tokensDeUsuarios(tx: DbTx, usuarioIds: string[]): Promise<string[]> {
    if (usuarioIds.length === 0) return [];
    // Lectura en modo sistema (`uow.run`, sin claims): la política
    // `dispositivos_select_sistema` (C3.1) activa la visibilidad de todos los
    // dispositivos SOLO cuando `request.jwt.claims` es NULL. Bajo claims del
    // usuario autenticado sigue aplicando `dispositivos_propios_select` y el
    // usuario solo ve sus propios dispositivos. INSERT/UPDATE/DELETE se
    // mantienen user-scoped.
    const result = await tx.query<{ push_token: string }>(
      `SELECT push_token FROM dispositivos WHERE usuario_id = ANY($1::uuid[])`,
      [usuarioIds],
    );
    return result.rows.map((r) => r.push_token);
  }

  async eliminar(tx: DbTx, id: string): Promise<boolean> {
    const result = await tx.query<{ id: string }>(
      'DELETE FROM dispositivos WHERE id = $1 RETURNING id',
      [id],
    );
    return result.rows.length > 0;
  }
}