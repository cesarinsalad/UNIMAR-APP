import { useMemo, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

import { siguienteOffsetConTotal } from '@/shared/lib/paginar';
import { listarEventos } from '../api/eventos.api';
import { DIAS_DISCOVERY, ventanaDias } from '../calendario-calculo';
import { PAGE_SIZE_EVENTOS } from './useAgenda';
import type { TipoEvento } from '../types';

/** Filtros que puede fijar la consola de gestión (undefined = sin recorte). */
export interface FiltrosEventosListado {
  tipo?: TipoEvento;
  q?: string;
}

/**
 * Discovery de eventos del campus: OFICIALES visibles por RLS (audiencia o
 * global) + INSTITUCIONALES, en los próximos 90 días, paginados por offset.
 * Va con `incluirOficiales='todos'`: aquí se verán todos, incluidos los
 * que el usuario todavía no agregó (discovery ≠ agenda). La consola de
 * gestión pasa filtros (`tipo`/`q`) que el BFF aplica server-side; sin
 * filtros es el mismo discovery del tab calendario.
 */
export function useEventosListado(filtros: FiltrosEventosListado = {}) {
  const { tipo = null, q = null } = filtros;
  const ventana = useMemo(() => ventanaDias(new Date(), DIAS_DISCOVERY), []);

  const query = useInfiniteQuery({
    queryKey: ['eventos', 'discovery', ventana.clave, tipo, q],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listarEventos({
        desde: ventana.desde,
        hasta: ventana.hasta,
        incluirOficiales: 'todos',
        tipo: tipo ?? undefined,
        q: q ?? undefined,
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
