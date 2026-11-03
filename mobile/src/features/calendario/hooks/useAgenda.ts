import { useInfiniteQuery } from '@tanstack/react-query';

import { siguienteOffsetConTotal } from '@/shared/lib/paginar';
import { listarEventos } from '../api/eventos.api';
import { ventanaMes } from '../calendario-calculo';

/** Tamaño de página dentro de la ventana mensual (default del contrato: 20). */
export const PAGE_SIZE_EVENTOS = 20;

/**
 * Agenda de un mes: la clave incluye la ventana clave-mes, así que cambiar
 * de mes es una query nueva y el cache por mes se conserva al navegar
 * ‹ ›. El rango obligatorio del contrato (~31 días) empata con la ventana.
 *
 * La agenda es opt-in: `incluirOficiales='agregados'` (por defecto) pide
 * solo tus PERSONAL + los OFICIALES que agregaste a tu agenda (`participar`)
 * + los INSTITUCIONAL. ('todos' = también los oficiales visibles que no
 * agregaste — pantalla de descubrimiento.)
 */
export function useAgenda(
  ventana: { desde: string; hasta: string; clave: string },
  incluirOficiales: 'todos' | 'agregados' = 'agregados',
) {
  return useInfiniteQuery({
    queryKey: ['eventos', 'agenda', ventana.clave, incluirOficiales],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listarEventos({
        desde: ventana.desde,
        hasta: ventana.hasta,
        incluirOficiales,
        limit: PAGE_SIZE_EVENTOS,
        offset: pageParam as number,
      }),
    getNextPageParam: (ultimaPagina, _todas, ultimoOffset) =>
      siguienteOffsetConTotal(ultimaPagina, ultimoOffset, PAGE_SIZE_EVENTOS),
  });
}

export { ventanaMes };
