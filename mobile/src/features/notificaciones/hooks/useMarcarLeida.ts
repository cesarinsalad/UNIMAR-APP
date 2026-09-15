import { useQueryClient, useMutation } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';

import { marcarNotificacionLeida } from '../api/notificaciones.api';
import { marcarLeidaEnPaginas, decrementarTotal } from './cambios-lectura';
import { CLAVES_NOTIFICACIONES } from './queryKeys';
import type { Notificacion } from '../types';

interface Snapshot {
  bandeja: InfiniteData<Notificacion[]> | undefined;
  noLeidas: { total: number } | undefined;
}

/**
 * Mutación optimista: marca la notificación como leída en caché
 * inmediatamente, decrementa el contador, y hace rollback si el backend
 * rechaza (404/notificación ajena). Al éxito, solo se invalida el contador
 * para que sea el servidor la fuente final; la bandeja no refetchea porque
 * el estado optimista ya es el definitivo.
 */
export function useMarcarLeida() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => marcarNotificacionLeida(id),
    onMutate: async (id): Promise<Snapshot> => {
      await queryClient.cancelQueries({ queryKey: CLAVES_NOTIFICACIONES.bandeja });

      const bandeja = queryClient.getQueryData<InfiniteData<Notificacion[]>>(CLAVES_NOTIFICACIONES.bandeja);
      const noLeidas = queryClient.getQueryData<{ total: number }>(CLAVES_NOTIFICACIONES.noLeidas);

      if (bandeja) {
        queryClient.setQueryData<InfiniteData<Notificacion[]>>(CLAVES_NOTIFICACIONES.bandeja, {
          ...bandeja,
          pages: marcarLeidaEnPaginas(bandeja.pages, id),
        });
      }
      if (noLeidas) {
        queryClient.setQueryData<{ total: number }>(
          CLAVES_NOTIFICACIONES.noLeidas,
          decrementarTotal(noLeidas.total),
        );
      }
      return { bandeja, noLeidas };
    },
    onError: (_err, _id, snapshot) => {
      if (snapshot?.bandeja) {
        queryClient.setQueryData(CLAVES_NOTIFICACIONES.bandeja, snapshot.bandeja);
      }
      if (snapshot?.noLeidas) {
        queryClient.setQueryData(CLAVES_NOTIFICACIONES.noLeidas, snapshot.noLeidas);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLAVES_NOTIFICACIONES.noLeidas });
    },
  });
}