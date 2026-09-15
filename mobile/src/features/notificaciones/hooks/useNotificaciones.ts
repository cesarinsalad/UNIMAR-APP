import { useInfiniteQuery } from '@tanstack/react-query';

import { aplanarPaginas } from '@/shared/lib/paginar';
import { listarNotificaciones } from '../api/notificaciones.api';
import { PAGE_SIZE_NOTIFICACIONES, calcularSiguienteOffset } from './paginacion';

export type EstadoBandeja = 'cargando' | 'refrescando' | 'pagina-siguiente' | 'ok' | 'error';

export function useNotificaciones() {
  return useInfiniteQuery({
    queryKey: ['notificaciones', 'bandeja'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listarNotificaciones({
        soloNoLeidas: false,
        limit: PAGE_SIZE_NOTIFICACIONES,
        offset: pageParam as number,
      }),
    // React Query llama con (ultimaPagina, todasLasPaginas, ultimoOffset, ...):
    // el adapter toma el ultimoOffset, que es nuestro acumulador de paginación.
    getNextPageParam: (ultimaPagina, _todas, ultimoOffset) =>
      calcularSiguienteOffset(ultimaPagina, ultimoOffset),
  });
}

/** Re-export del genérico para los consumidores de la feature. */
export { aplanarPaginas };
