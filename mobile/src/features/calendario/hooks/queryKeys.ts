/** Claves de React Query del módulo calendario. Prefijo común 'eventos'. */
export const CLAVES_EVENTOS = {
  agenda: (claveMes: string) => ['eventos', 'agenda', claveMes] as const,
  detalle: (id: string) => ['eventos', 'detalle', id] as const,
  prefijo: ['eventos'] as const,
};