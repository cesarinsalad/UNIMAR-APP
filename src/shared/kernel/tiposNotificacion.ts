/**
 * Tipos de notificación compartidos por el shared kernel.
 *
 * Definidos aquí (no en `modules/notificaciones/domain/notificacion.ts`) para
 * que el módulo de Calendario pueda emitir notificaciones desde su job de
 * recordatorios sin importar el dominio de Notificaciones (mantiene la
 * frontera DSBC).
 */
export const TIPOS_NOTIFICACION = [
  'COMUNICADO_PUBLICADO',
  'COMUNICADO_RECHAZADO',
  'EVENTO_OFICIAL_CREADO',
  'EVENTO_RECORDATORIO',
  'NOTA_PUBLICADA',
] as const;

export type TipoNotificacion = (typeof TIPOS_NOTIFICACION)[number];
