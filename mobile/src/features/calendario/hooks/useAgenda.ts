import { useInfiniteQuery } from '@tanstack/react-query';

import { siguienteOffset } from '@/shared/lib/paginar';
import { listarEventos } from '../api/eventos.api';
import { ventanaMes } from '../calendario-calculo';

/** Tamaño de página dentro de la ventana mensual (default del contrato: 20). */
export const PAGE_SIZE_EVENTOS = 20;

/**
 * Agenda de un mes: la clave incluye la ventana clave-mes, así que cambiar
 * de mes es una query nueva y el cache por mes se conserva al navegar
 * ‹ ›. El rango obligatorio del contrato (~31 días) empata con la ventana.
 */
export function useAgenda(ventana: { desde: string; hasta: string; clave: string }) {
  return useInfiniteQuery({
    queryKey: ['eventos', 'agenda', ventana.clave],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listarEventos({
        desde: ventana.desde,
        hasta: ventana.hasta,
        limit: PAGE_SIZE_EVENTOS,
        offset: pageParam as number,
      }),
    getNextPageParam: (ultimaPagina, _todas, ultimoOffset) =>
      siguienteOffset(ultimaPagina, ultimoOffset, PAGE_SIZE_EVENTOS),
  });
}

export { ventanaMes };
