import { useInfiniteQuery } from '@tanstack/react-query';

import { listarComunicados } from '../api/comunicados.api';
import { siguienteOffset } from '@/shared/lib/paginar';
import { CLAVES_COMUNICADOS } from './queryKeys';
import { PAGE_SIZE_COMUNICADOS } from './useComunicadosFeed';
import type { EstadoComunicado } from '../types';

/**
 * Listado de gestión por estado (el query infinito que antes vivía inline
 * en mis.tsx). La RLS decide el alcance: un ADMIN ve la cola GLOBAL del
 * estado pedido (acá vive la cola "Por revisar"); un COMUNICADOR solo los
 * propios; un ESTUDIANTE obtiene lista vacía para BORRADOR/PENDIENTE.
 */
export function useMisComunicados(estado: EstadoComunicado) {
  return useInfiniteQuery({
    queryKey: CLAVES_COMUNICADOS.mis(estado),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listarComunicados({
        estado,
        limit: PAGE_SIZE_COMUNICADOS,
        offset: pageParam as number,
      }),
    getNextPageParam: (ultima, _todas, ultimoOffset) =>
      siguienteOffset(ultima, ultimoOffset, PAGE_SIZE_COMUNICADOS),
  });
}
