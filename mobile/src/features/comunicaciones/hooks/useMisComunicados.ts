import { useInfiniteQuery } from '@tanstack/react-query';

import { siguienteOffsetConTotal, totalDePaginas } from '@/shared/lib/paginar';
import { listarComunicados } from '../api/comunicados.api';
import { CLAVES_COMUNICADOS } from './queryKeys';
import { PAGE_SIZE_COMUNICADOS } from './useComunicadosFeed';
import type { EstadoComunicado } from '../types';

/**
 * Listado de gestión por estado (el query infinito que antes vivía inline
 * en mis.tsx). La RLS decide el alcance: un ADMIN ve la cola GLOBAL del
 * estado pedido (acá vive la cola "Por revisar"); un COMUNICADOR solo los
 * propios; un ESTUDIANTE obtiene lista vacía para BORRADOR/PENDIENTE.
 *
 * `filtro.q` (búsqueda server-side: título O cuerpo) y `filtro.categoria`
 * entran en la queryKey, así cada combinación tiene caché propia.
 */
export function useMisComunicados(
  estado: EstadoComunicado,
  filtro: { q?: string; categoria?: string } = {},
) {
  const query = useInfiniteQuery({
    queryKey: [...CLAVES_COMUNICADOS.mis(estado), filtro.q ?? '', filtro.categoria ?? ''],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listarComunicados({
        estado,
        q: filtro.q || undefined,
        categoria: filtro.categoria || undefined,
        limit: PAGE_SIZE_COMUNICADOS,
        offset: pageParam as number,
      }),
    getNextPageParam: (ultima, _todas, ultimoOffset) =>
      siguienteOffsetConTotal(ultima, ultimoOffset, PAGE_SIZE_COMUNICADOS),
  });
  return query;
}

/**
 * Total exacto de la cola (viene del count del BFF bajo las mismas claims).
 * Todas las páginas comparten queryKey (mismos filtros), así el total de
 * la primera página sirve para toda la colección.
 */
export function totalDeCola(
  query: ReturnType<typeof useMisComunicados>,
): number {
  return totalDePaginas(query.data?.pages);
}
