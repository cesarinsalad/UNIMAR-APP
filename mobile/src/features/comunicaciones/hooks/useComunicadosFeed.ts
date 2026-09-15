import { useInfiniteQuery } from '@tanstack/react-query';

import { aplanarPaginas, siguienteOffset } from '@/shared/lib/paginar';
import { listarComunicados } from '../api/comunicados.api';

/** Tamaño de página del feed (default del contrato: 20). */
export const PAGE_SIZE_COMUNICADOS = 20;

/**
 * Feed público: PUBLICADO para todos los roles. La visibilidad real
 * (ventana programado/expira + audiencia/GLOBAL) la decide RLS en el BFF;
 * los borradores y pendientes viven en la pantalla de gestión (3c).
 */
export function useComunicadosFeed() {
  return useInfiniteQuery({
    queryKey: ['comunicados', 'feed'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listarComunicados({
        estado: 'PUBLICADO',
        limit: PAGE_SIZE_COMUNICADOS,
        offset: pageParam as number,
      }),
    getNextPageParam: (ultimaPagina, _todas, ultimoOffset) =>
      siguienteOffset(ultimaPagina, ultimoOffset, PAGE_SIZE_COMUNICADOS),
  });
}

/** Aplana las páginas del infinite query a una sola lista para el FlatList. */
export { aplanarPaginas };