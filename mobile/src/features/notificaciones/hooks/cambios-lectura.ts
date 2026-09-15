import type { Notificacion } from '../types';

/**
 * Transformaciones puras de la caché de React Query para las mutaciones
 * optimistas de lectura. Testeables sin renderizar nada (jest puro).
 */

export function marcarLeidaEnPaginas(
  paginas: Notificacion[][],
  id: string,
): Notificacion[][] {
  return paginas.map((pagina) =>
    pagina.map((n) => (n.id === id && !n.leida ? { ...n, leida: true } : n)),
  );
}

export function marcarTodasEnPaginas(paginas: Notificacion[][]): Notificacion[][] {
  return paginas.map((pagina) =>
    pagina.map((n) => (n.leida ? n : { ...n, leida: true })),
  );
}

/** Nunca baja de 0 aunque total sea undefined (no hay filas por decrementar). */
export function decrementarTotal(actual: number | undefined): { total: number } {
  return { total: Math.max(0, (actual ?? 0) - 1) };
}