import { useInfiniteQuery } from '@tanstack/react-query';

import { siguienteOffsetConTotal } from '@/shared/lib/paginar';
import { listarComunicados } from '../api/comunicados.api';

/** Tamaño de página del feed (default del contrato: 20). */
export const PAGE_SIZE_COMUNICADOS = 20;

/**
 * Feed público: PUBLICADO para todos los roles. La visibilidad real
 * (ventana programado/expira + audiencia/GLOBAL) la decide RLS en el BFF;
 * los borradores y pendientes viven en la pantalla de gestión (3c).
 * `q` busca por título O cuerpo (ILIKE), ordenados por fecha DESC.
 * El wire trae {items,total}: paginación con fin exacto.
 */
export function useComunicadosFeed(
  categoria: string | null = null,
  q: string | null = null,
) {
  return useInfiniteQuery({
    queryKey: ['comunicados', 'feed', categoria ?? 'todas', q ?? ''],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listarComunicados({
        estado: 'PUBLICADO',
        categoria: categoria ?? undefined,
        q: q ?? undefined,
        limit: PAGE_SIZE_COMUNICADOS,
        offset: pageParam as number,
      }),
    getNextPageParam: (ultimaPagina, _todas, ultimoOffset) =>
      siguienteOffsetConTotal(ultimaPagina, ultimoOffset, PAGE_SIZE_COMUNICADOS),
  });
}