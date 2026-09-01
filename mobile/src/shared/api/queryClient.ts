import { QueryClient } from '@tanstack/react-query';

/**
 * Configuración global de TanStack Query.
 * - staleTime por defecto 0: cada navegación refetchea si los datos son stale.
 *   Los módulos pueden sobreescribir (notifications staleTime: 0, académico: 5 min, etc).
 * - gcTime por defecto 5 min para evitar retención eterna al desuscribir.
 * - retry: solo 1 vez para errores 4xx; 2 veces para 5xx y red.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } } | undefined)?.response?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
    },
  },
});