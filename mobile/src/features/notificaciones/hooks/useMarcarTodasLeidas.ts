import { useQueryClient, useMutation } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';

import { marcarTodasLeidas } from '../api/notificaciones.api';
import { marcarTodasEnPaginas } from './cambios-lectura';
import { CLAVES_NOTIFICACIONES } from './queryKeys';
import type { Notificacion } from '../types';

interface Snapshot {
  bandeja: InfiniteData<Notificacion[]> | undefined;
  noLeidas: { total: number } | undefined;
}

/**
 * Mutación optimista de "marcar todo leído": toda la caché pasa a leída y
 * el contador a 0 de inmediato. Al éxito se invalida el PREFIJO común
 * ('notificaciones') para re-verificar ambas queries contra el
 * servidor; falla → rollback del snapshot.
 */
export function useMarcarTodasLeidas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => marcarTodasLeidas(),
    onMutate: async (): Promise<Snapshot> => {
      await queryClient.cancelQueries({ queryKey: CLAVES_NOTIFICACIONES.prefijo });

      const bandeja = queryClient.getQueryData<InfiniteData<Notificacion[]>>(CLAVES_NOTIFICACIONES.bandeja);
      const noLeidas = queryClient.getQueryData<{ total: number }>(CLAVES_NOTIFICACIONES.noLeidas);

      if (bandeja) {
        queryClient.setQueryData<InfiniteData<Notificacion[]>>(CLAVES_NOTIFICACIONES.bandeja, {
          ...bandeja,
          pages: marcarTodasEnPaginas(bandeja.pages),
        });
      }
      if (noLeidas) {
        queryClient.setQueryData<{ total: number }>(CLAVES_NOTIFICACIONES.noLeidas, { total: 0 });
      }
      return { bandeja, noLeidas };
    },
    onError: (_err, _vars, snapshot) => {
      if (snapshot?.bandeja) {
        queryClient.setQueryData(CLAVES_NOTIFICACIONES.bandeja, snapshot.bandeja);
      }
      if (snapshot?.noLeidas) {
        queryClient.setQueryData(CLAVES_NOTIFICACIONES.noLeidas, snapshot.noLeidas);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLAVES_NOTIFICACIONES.prefijo });
    },
  });
}