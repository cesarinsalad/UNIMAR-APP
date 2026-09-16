import { useQueryClient, useMutation } from '@tanstack/react-query';

import { CLAVES_COMUNICADOS } from './queryKeys';

/** Mutación genérica de comunicados: al éxito invalida TODO el módulo
 * (feed, mis, detalle) para que la lista y estado recarguen coherentes. */
export function useMutacionComunicado<TArgs, TResult>(
  mutacion: (args: TArgs) => Promise<TResult>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: mutacion,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLAVES_COMUNICADOS.prefijo });
    },
  });
}