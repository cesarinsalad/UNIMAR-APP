import { useMutation, useQueryClient } from '@tanstack/react-query';

import { CLAVES_EVENTOS } from './queryKeys';

/** Mutación genérica de eventos: al éxito invalida agenda + detalle. */
export function useMutacionEvento<TArgs, TResult>(
  mutacion: (args: TArgs) => Promise<TResult>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: mutacion,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLAVES_EVENTOS.prefijo });
    },
  });
}
