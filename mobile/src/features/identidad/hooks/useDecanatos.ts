import { useQuery } from '@tanstack/react-query';

import { listarDecanatos } from '../api/decanatos.api';

/**
 * Catálogo de decanatos para los selectores de audiencia (comunicados 3c,
 * eventos del Paso 4). Catálogo casi inmutable en runtime → staleTime 24h:
 * una sola lectura por sesión de app, refresh sobrenómico al cambiar de día.
 */
export function useDecanatos() {
  return useQuery({
    queryKey: ['decanatos'],
    queryFn: listarDecanatos,
    staleTime: 24 * 60 * 60 * 1000,
  });
}