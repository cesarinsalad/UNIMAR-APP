import { useQuery } from '@tanstack/react-query';

import { obtenerEvento } from '../api/eventos.api';
import { CLAVES_EVENTOS } from './queryKeys';

/** Detalle de evento (lo consumen el detalle 4c y el prefill del formulario). */
export function useEventoDetalle(id: string) {
  return useQuery({
    queryKey: CLAVES_EVENTOS.detalle(id),
    queryFn: () => obtenerEvento(id),
    staleTime: 60 * 1000,
  });
}
