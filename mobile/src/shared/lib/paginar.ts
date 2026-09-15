/**
 * Paginación por offset/limit del BFF: los endpoints de lista devuelven un
 * arreglo plano SIN `total`, así que el fin de la paginación se infiere de
 * la longitud de la página. Mientras la página llegue completa asumimos que
 * hay más; una página incompleta o vacía cierra el ciclo.
 *
 * Genérico para todas las features (notificaciones, comunicados, eventos).
 */

export function siguienteOffset(
  pagina: unknown[],
  offset: number,
  pageSize: number,
): number | undefined {
  if (pagina.length < pageSize) return undefined;
  return offset + pagina.length;
}

/** Aplana las páginas del infinite query a una sola lista para el FlatList. */
export function aplanarPaginas<T>(paginas: T[][] | undefined): T[] {
  if (!paginas) return [];
  return paginas.flat();
}