import type { DbTx } from '../../../shared/kernel/db';
import type {
  INotificadorInApp,
  IProveedorTokens,
} from '../../../shared/kernel/notificacion';
import type { Notificacion } from './notificacion';
import type { Dispositivo, Plataforma } from './dispositivo';

/**
 * Puerto de repositorio del componente Notificaciones (bandeja + fan-out).
 *
 * Cada método recibe explícitamente la transacción (`DbTx`) porque toda
 * operación debe ejecutarse dentro del UnitOfWork del BFF, donde RLS evalúa
 * los claims del usuario autenticado. La bandeja solo expone filas del
 * propio usuario autenticado (políticas SELECT/UPDATE/DELETE ya lo imponen).
 *
 * `crearMasivo` lo usa el fan-out.
 * El publicador inserta notificaciones para OTROS usuarios bajo una transacción que NO es la suya.
 * La política de INSERT es `WITH CHECK(true)` precisamente para permitirlo.
 *
 * Extiende `INotificadorInApp` del shared kernel: cualquier consumidor del
 * kernel que necesite crear notificaciones puede recibir un
 * `INotificacionRepository` directamente (el contrato es estructural).
 */
export interface INotificacionRepository extends INotificadorInApp {
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
 *
 * Extiende `IProveedorTokens` del shared kernel: el job de recordatorios
 * puede recibir un `IDispositivoRepository` directamente para resolver
 * tokens (contrato estructural).
 */
export interface IDispositivoRepository extends IProveedorTokens {
  upsert(
    tx: DbTx,
    input: { usuarioId: string; pushToken: string; plataforma: Plataforma },
  ): Promise<Dispositivo | null>;

  listarPorUsuario(tx: DbTx, usuarioId: string): Promise<Dispositivo[]>;

  eliminar(tx: DbTx, id: string): Promise<boolean>;
}

/** Re-export del shared kernel para mantener compatibilidad con imports previos. */
export type { IPushService, PushMensaje } from '../../../shared/kernel/notificacion';
