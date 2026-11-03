/**
 * Paginación del BFF. Dos modos, según lo que devuelva el endpoint:
 *
 * 1. Arreglo plano SIN `total` (notificaciones): el fin de la paginación se
 *    infiere de la longitud de la página. Mientras la página llegue completa
 *    asumimos que hay más; una página incompleta o vacía cierra el ciclo.
 *
 * 2. Envoltorio `{ items, total }` (comunicados y eventos): el total viene
 *    del count del BFF bajo las mismas claims (RLS), así que el fin se
 *    sabe exacto y los contadores "N de M" son reales.
 *
 * Genérico para todas las features. `aplanarPaginas` tolera ambas formas
 * de página (transición de wire), pero los hooks nuevos de comunicados/
 * eventos usan las variantes `*ConTotal`.
 */

export interface PaginaRemota<T> {
  items: T[];
  total: number;
}

/** Guard de forma: la página es un envoltorio {items,total} y no un array. */
export function esPaginaRemota<T>(pagina: unknown): pagina is PaginaRemota<T> {
  return (
    typeof pagina === 'object' &&
    pagina !== null &&
    Array.isArray((pagina as PaginaRemota<T>).items)
  );
}

export function siguienteOffset(
  pagina: unknown[],
  offset: number,
  pageSize: number,
): number | undefined {
  if (pagina.length < pageSize) return undefined;
  return offset + pagina.length;
}

/**
 * Variante con total conocido: el listado termina cuando el offset consumido
 * iguala/rocía el total (el fin es exacto, no inferido). Doble guard: una
 * página incompleta también cierra (red de seguridad si el total y los
 * items alguna vez desincronizan).
 *
 * Tolerante al wire legacy (arreglo plano, BFF viejo o caché): trata el
 * array como items con total desconocido → fin inferido por longitud de
 * página, igual que `siguienteOffset`. Nunca lanza si `pagina.items`
 * viene undefined.
 */
export function siguienteOffsetConTotal<T>(
  pagina: PaginaRemota<T> | T[] | undefined,
  offset: number,
  pageSize: number,
): number | undefined {
  if (!pagina) return undefined;
  if (Array.isArray(pagina)) {
    return siguienteOffset(pagina, offset, pageSize);
  }
  if (pagina.items.length < pageSize) return undefined;
  const avanzado = offset + pagina.items.length;
  if (avanzado >= pagina.total) return undefined;
  return avanzado;
}

/** Aplana las páginas del infinite query a una sola lista para el FlatList. */
export function aplanarPaginas<T>(
  paginas: T[][] | PaginaRemota<T>[] | undefined,
): T[] {
  if (!paginas) return [];
  return paginas.flatMap((pagina) => (Array.isArray(pagina) ? pagina : pagina.items));
}

/** Aplana páginas `{items,total}` a una sola lista para el FlatList. */
export function aplanarPaginasConTotal<T>(
  paginas: PaginaRemota<T>[] | undefined,
): T[] {
  if (!paginas) return [];
  return paginas.flatMap((pagina) => pagina.items);
}

/**
 * Total del infinite query (todas las páginas comparten queryKey con los
 * mismos filtros, así el total de la primera vale para todas). Para etiquetas
 * "N de M" y contadores del panel.
 *
 * Con páginas legacy (arrays, BFF viejo): cuenta lo cargado — es una cota
 * parcial, no el total del servidor; la UI la trata como número provisorio.
 */
export function totalDePaginas<T>(
  paginas: PaginaRemota<T>[] | T[][] | undefined,
): number {
  const primera = paginas?.[0];
  if (primera === undefined || !paginas) return 0;
  if (Array.isArray(primera)) {
    return paginas.reduce<number>((acumulado, pagina) => {
      const largo = Array.isArray(pagina) ? pagina.length : pagina.items.length;
      return acumulado + largo;
    }, 0);
  }
  return primera.total;
}
