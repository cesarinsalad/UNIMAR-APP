/**
 * Entidad del dominio Notificaciones.
 *
 * Una notificación es un mensaje corto dirigido a UN usuario concreto
 * (bandeja in-app). Se diferencia del `comunicado` (difusión a audiencias) y
 * del `evento` (calendario). Se genera por eventos del sistema — Fan-out de
 * comunicados publicados/rechazados — y se consulta exclusivamente desde el
 * usuario destinatario (RLS lo garantiza).
 *
 * Los tipos de notificación (`TIPOS_NOTIFICACION` y `TipoNotificacion`) se
 * re-exportan del shared kernel para que otros módulos (Calendario) puedan
 * emitir notificaciones sin acoplarse al dominio de Notificaciones. Los
 * archivos internos del módulo siguen importándolos desde aquí para no
 * depender directamente del shared kernel.
 */
import { TIPOS_NOTIFICACION, type TipoNotificacion } from '../../../shared/kernel/tiposNotificacion';

export { TIPOS_NOTIFICACION };
export type { TipoNotificacion };

export interface Notificacion {
  id: string;
  usuarioId: string;
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo: string;
  /** ID del recurso al que apunta (p. ej. el comunicado). Null si no aplica. */
  referenciaId: string | null;
  leida: boolean;
  createdAt: Date;
}
