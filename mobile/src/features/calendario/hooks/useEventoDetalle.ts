import { useQuery } from '@tanstack/react-query';

import { obtenerEvento } from '../api/eventos.api';
import { CLAVES_EVENTOS } from './queryKeys';

/**
 * Detalle de evento (lo consumen el detalle 4c y el prefill del formulario).
 * `activada: false` lo apaga (formularios en modo creación no deben pedir
 * `/eventos/:id` — el id no existe aún).
 */
export function useEventoDetalle(id: string, opciones?: { activada?: boolean }) {
  return useQuery({
    queryKey: CLAVES_EVENTOS.detalle(id),
    queryFn: () => obtenerEvento(id),
    staleTime: 60 * 1000,
    enabled: opciones?.activada ?? true,
  });
}
