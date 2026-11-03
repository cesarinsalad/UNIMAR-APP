import { useMemo, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

import { siguienteOffsetConTotal } from '@/shared/lib/paginar';
import { listarEventos } from '../api/eventos.api';
import { DIAS_DISCOVERY, ventanaDias } from '../calendario-calculo';
import { PAGE_SIZE_EVENTOS } from './useAgenda';

/**
 * Discovery de eventos del campus: OFICIALES visibles por RLS (audiencia o
 * global) + INSTITUCIONALES, en los próximos 90 días, paginados por offset.
 * Va con `incluirOficiales='todos'`: aquí se verán todos, incluidos los
 * que el usuario todavía no agregó (discovery ≠ agenda).
 */
export function useEventosListado() {
  const ventana = useMemo(() => ventanaDias(new Date(), DIAS_DISCOVERY), []);

  const query = useInfiniteQuery({
    queryKey: ['eventos', 'discovery', ventana.clave],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listarEventos({
        desde: ventana.desde,
        hasta: ventana.hasta,
        incluirOficiales: 'todos',
        limit: PAGE_SIZE_EVENTOS,
        offset: pageParam as number,
      }),
    getNextPageParam: (ultimaPagina, _todas, ultimoOffset) =>
      siguienteOffsetConTotal(ultimaPagina, ultimoOffset, PAGE_SIZE_EVENTOS),
  });

  const paginar = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query.hasNextPage, query.isFetchingNextPage, query]);

  return { eventos: query, paginar };
}
