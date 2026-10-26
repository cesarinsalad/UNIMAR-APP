import { useMutation, useQueryClient } from '@tanstack/react-query';

import { CLAVES_EVENTOS } from './queryKeys';
import { participarEvento, abandonarEvento } from '../api/eventos.api';

/**
 * Mutaciones de "agregar/quitar de mi agenda" (pivot participar): al éxito
 * invalida agenda + discovery + detalle para refrescar `participo` en todas
 * las vistas.
 */
export function useParticipacion() {
  const queryClient = useQueryClient();

  const invalidar = () => {
    void queryClient.invalidateQueries({ queryKey: CLAVES_EVENTOS.prefijo });
  };

  const agregar = useMutation({
    mutationFn: participarEvento,
    onSuccess: invalidar,
  });
  const quitar = useMutation({
    mutationFn: abandonarEvento,
    onSuccess: invalidar,
  });

  return { agregar, quitar };
}
