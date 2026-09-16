import { useQuery } from '@tanstack/react-query';

import { obtenerComunicado } from '../api/comunicados.api';

/**
 * Detalle de un comunicado. El GET del BFF registra la lectura del usuario
 * si no es el autor (idempotente a nivel DB: ON CONFLICT DO NOTHING sobre la
 * PK (comunicado_id, usuario_id)).
 *
 * staleTime 60s: navegar de ida y vuelta no repite el GET en 1 minuto, lo
 * que reduce peticiones sin sacrificar la frescura que demanda un feed.
 */
export function useComunicadoDetalle(id: string) {
  return useQuery({
    queryKey: ['comunicados', 'detalle', id],
    queryFn: () => obtenerComunicado(id),
    staleTime: 60 * 1000,
  });
}
