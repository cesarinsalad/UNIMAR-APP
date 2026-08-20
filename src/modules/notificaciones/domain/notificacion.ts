/**
 * Entidad del dominio Notificaciones.
 *
 * Una notificación es un mensaje corto dirigido a UN usuario concreto
 * (bandeja in-app). Se diferencia del `comunicado` (difusión a audiencias) y
 * del `evento` (calendario). Se genera por eventos del sistema — Fan-out de
 * comunicados publicados/rechazados — y se consulta exclusivamente desde el
 * usuario destinatario (RLS lo garantiza).
 */
export const TIPOS_NOTIFICACION = ['COMUNICADO_PUBLICADO', 'COMUNICADO_RECHAZADO'] as const;
export type TipoNotificacion = (typeof TIPOS_NOTIFICACION)[number];

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
