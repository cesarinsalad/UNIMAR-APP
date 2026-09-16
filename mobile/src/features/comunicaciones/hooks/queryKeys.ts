/** Claves de React Query del módulo de comunicaciones. El prefijo común
 * ('comunicados') permite invalidar feed + mis + detalle a la vez. */
export const CLAVES_COMUNICADOS = {
  feed: ['comunicados', 'feed'] as const,
  mis: (estado: string) => ['comunicados', 'mis', estado] as const,
  detalle: (id: string) => ['comunicados', 'detalle', id] as const,
  adjuntos: (id: string) => ['comunicados', 'adjuntos', id] as const,
  prefijo: ['comunicados'] as const,
};