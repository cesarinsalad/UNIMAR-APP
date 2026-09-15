/** Claves de React Query del módulo de notificaciones. Prefijo común
 * 'notificaciones' permite invalidar por prefijo (p. ej. al llegar un push). */
export const CLAVES_NOTIFICACIONES = {
  bandeja: ['notificaciones', 'bandeja'] as const,
  noLeidas: ['notificaciones', 'no-leidas'] as const,
  /** Prefijo para invalidar ambas a la vez. */
  prefijo: ['notificaciones'] as const,
};