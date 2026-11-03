import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Comunicado } from '../types';
import { CLAVES_COMUNICADOS } from './queryKeys';
import type { PaginaRemota } from '@/shared/lib/paginar';

/** Mutación genérica de comunicados: al éxito invalida TODO el módulo
 * (feed, mis, detalle, conteos) para que la lista y estado recarguen
 * coherentes. */
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

export interface OpcionesMutacionComunicado<TArgs> {
  /**
   * Args → id del comunicado que toca la mutación (transiciones de estado).
   * Con esto la mutación aplica *optimistic removal*: quita el comunicado
   * de todas las páginas cacheadas (feed + colas del infinite query) ANTES
   * de disparar la request, así la fila desaparece al instante sin esperar
   * el refetch en cascada. Si falla, se restauran las páginas exactas.
   * El resultado (si es la entidad Comunicado actualizada) se sincroniza
   * en el caché del detalle.
   */
  idTocado?: (args: TArgs) => string;
}

function esListadoPaginado<T>(data: unknown): data is PaginaRemota<T> {
  return (
    typeof data === 'object' &&
    data !== null &&
    Array.isArray((data as PaginaRemota<T>).items)
  );
}

/**
 * Mutación de transición con optimistic removal: la fila sale de la cola en
 * el mismo tick del tap (no tras el refetch de TODO el módulo) y si el BFF
 * rechaza, vuelve exactamente como estaba (snapshot por caché). Estructura:
 * quitar → si ok, pisa el detalle sincronizado + invalidate en background;
 * si error, restaura.
 */
export function useTransicionComunicado<
  TArgs extends { id: string; motivo?: string },
>(
  mutacion: (id: string, motivo: string, args: TArgs) => Promise<Comunicado>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: TArgs) => mutacion(args.id, args.motivo ?? '', args),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: CLAVES_COMUNICADOS.prefijo });
      const paginas = queryClient
        .getQueryCache()
        .findAll({ queryKey: CLAVES_COMUNICADOS.prefijo })
        .map((c) => ({ queryKey: c.queryKey, data: c.state.data }));
      for (const { queryKey, data } of paginas) {
        if (!esListadoPaginado<Comunicado>(data)) continue;
        const items = data.items.filter((c) => c.id !== id);
        if (items.length !== data.items.length) {
          queryClient.setQueryData(queryKey, { ...data, items });
        }
      }
      return { paginas };
    },
    onError: (_e, _v, ctx) => {
      if (!ctx) return;
      for (const { queryKey, data } of ctx.paginas) {
        queryClient.setQueryData(queryKey, data);
      }
    },
    onSuccess: (comunicado, { id }) => {
      queryClient.setQueryData(CLAVES_COMUNICADOS.detalle(id), comunicado);
      void queryClient.invalidateQueries({ queryKey: CLAVES_COMUNICADOS.prefijo });
    },
  });
}
