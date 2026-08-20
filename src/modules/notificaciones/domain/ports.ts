import type { DbTx } from '../../../shared/kernel/db';
import type { Notificacion } from './notificacion';
import type { Dispositivo, Plataforma } from './dispositivo';

/**
 * Puerto de repositorio del componente Notificaciones (bandeja).
 *
 * Cada método recibe explícitamente la transacción (`DbTx`) porque toda
 * operación debe ejecutarse dentro del UnitOfWork del BFF, donde RLS evalúa
 * los claims del usuario autenticado. La bandeja solo expone filas del
 * propio usuario autenticado (políticas SELECT/UPDATE/DELETE ya lo imponen).
 */
export interface INotificacionRepository {
  listar(
    tx: DbTx,
    filtro: { soloNoLeidas: boolean; limit: number; offset: number },
  ): Promise<Notificacion[]>;

  contarNoLeidas(tx: DbTx): Promise<number>;

  /** Devuelve null si la notificación no existe o pertenece a otro usuario (RLS). */
  marcarLeida(tx: DbTx, id: string): Promise<Notificacion | null>;

  /** Cantidad de notificaciones marcadas como leídas en la operación. */
  marcarTodasLeidas(tx: DbTx): Promise<number>;
}

/**
 * Puerto de repositorio para dispositivos (push tokens).
 *
 * El `upsert` fuerza que `usuarioId` venga de los claims: aunque la política
 * RLS ya exige esa coincidencia, se valida en el dominio para defensa en
 * profundidad y para distinguir el caso "token pertenece a otro usuario"
 * (devuelve null → 409 en la capa HTTP).
 */
export interface IDispositivoRepository {
  upsert(
    tx: DbTx,
    input: { usuarioId: string; pushToken: string; plataforma: Plataforma },
  ): Promise<Dispositivo | null>;

  listarPorUsuario(tx: DbTx, usuarioId: string): Promise<Dispositivo[]>;

  eliminar(tx: DbTx, id: string): Promise<boolean>;
}
