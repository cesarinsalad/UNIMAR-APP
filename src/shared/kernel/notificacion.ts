import type { DbTx } from './db';
import type { TipoNotificacion } from './tiposNotificacion';

/**
 * Puertos del shared kernel para capacidades de notificación (Paso 4).
 *
 * El módulo de Calendario necesita generar notificaciones in-app y push
 * desde su job de recordatorios. Para no acoplar Calendario al módulo de
 * Notificaciones (manteniendo la frontera DSBC), se definen aquí las
 * interfaces mínimas que ambos módulos comparten. Notificaciones las
 * implementa localmente (los repos de Notificaciones satisfacen estos
 * puertos estructuralmente: tienen los mismos métodos que el job necesita
 * para crearMasivo y resolver tokens, y se "conectan" en el composition
 * root con un adaptador trivial o por duck-typing).
 *
 * Esta indirección evita que el calendario dependa de
 * `modules/notificaciones/domain/ports`. La inversión de dependencia
 * apunta al shared kernel, que es el lugar correcto para contratos
 * compartidos por múltiples módulos.
 */

/** Forma mínima que el job necesita de un repositorio de notificaciones. */
export interface INotificadorInApp {
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

/** Forma mínima para resolver los push tokens de un conjunto de usuarios. */
export interface IProveedorTokens {
  tokensDeUsuarios(tx: DbTx, usuarioIds: string[]): Promise<string[]>;
}

/** Mensaje push individual (mismo contrato que ya consume Notificaciones). */
export interface PushMensaje {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
}

/** Puerto del proveedor push (best-effort, swallow + log de errores). */
export interface IPushService {
  enviar(mensajes: PushMensaje[]): Promise<void>;
}
