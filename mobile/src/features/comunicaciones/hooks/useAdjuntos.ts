import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  eliminarAdjunto,
  listarAdjuntos,
  subirAdjunto,
  type ArchivoAdjunto,
} from '../api/adjuntos.api';
import { CLAVES_COMUNICADOS } from './queryKeys';
import type { Adjunto } from '../types';

/** Lista de adjuntos de un comunicado (RLS hereda la visibilidad del padre). */
export function useAdjuntos(comunicadoId: string) {
  return useQuery({
    queryKey: CLAVES_COMUNICADOS.adjuntos(comunicadoId),
    queryFn: () => listarAdjuntos(comunicadoId),
  });
}

/** Subida en dos fases: al éxito invalida la lista del comunicado. */
export function useSubirAdjunto(comunicadoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (archivo: ArchivoAdjunto) => subirAdjunto(comunicadoId, archivo),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: CLAVES_COMUNICADOS.adjuntos(comunicadoId),
      });
    },
  });
}

export function useEliminarAdjunto(comunicadoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (adjunto: Adjunto) => eliminarAdjunto(adjunto.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: CLAVES_COMUNICADOS.adjuntos(comunicadoId),
      });
    },
  });
}
