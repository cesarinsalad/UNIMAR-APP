import type { DbTx } from '../../../shared/kernel/db';
import type { Notificacion, TipoNotificacion } from './notificacion';
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

  /**
   * Inserta una notificación por cada id de usuario. Una sola sentencia
   * (`unnest`) para minimizar round-trips en el fan-out. `referenciaId`
   * puede ser null si el evento no apunta a un recurso concreto.
   */
  crearMasivo(
    tx: DbTx,
    input: {
      usuarioIds: string[];
      tipo: TipoNotificacion;
      titulo: string;
      cuerpo: string;
      referenciaId: string | null;
    },
  ): Promise<void>;
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

  /**
   * Devuelve los push tokens de los usuarios dados. Pensado para el fan-out,
   * donde se buscan los destinatarios y sus tokens en dos queries dentro del
   * mismo tx. `[]` si nadie tiene dispositivo registrado.
   */
  tokensDeUsuarios(tx: DbTx, usuarioIds: string[]): Promise<string[]>;
}

/**
 * Mensaje push individual. Modela el contrato común que entiende el adapter
 * (Expo); el dominio no conoce el detalle HTTP del proveedor.
 */
export interface PushMensaje {
  /** Push token destino (Expo Push Token, FCM, APNs). */
  to: string;
  title: string;
  body: string;
  /** Carga arbitraria para que la app móvil haga deep-link o clasificación. */
  data?: Record<string, unknown>;
  /** 'default' activa el sonido estándar en la mayoría de plataformas. */
  sound?: 'default' | null;
}

/**
 * Puerto del proveedor de notificaciones push.
 *
 * Best-effort: la implementación debe swallow + log errores (timeouts, 5xx,
 * tokens inválidos). Nunca debe lanzar, porque se ejecuta post-COMMIT y un
 * fallo no debe propagarse al cliente que originó la publicación.
 */
export interface IPushService {
  enviar(mensajes: PushMensaje[]): Promise<void>;
}
