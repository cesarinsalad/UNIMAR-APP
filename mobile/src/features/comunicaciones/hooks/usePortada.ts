import { useQuery } from '@tanstack/react-query';

import { CLAVES_COMUNICADOS } from './queryKeys';
import { urlPortada } from '../api/comunicados.api';

/**
 * URL firmada de la portada de un comunicado.
 *
 * `hasPortada` es el gate (comunicado.imagenPath != null): sin portada la
 * query no se ejecuta y `url` queda undefined. TTL de la URL es 300 s, así
 * que staleTime corto: recargar la pantalla re-firma.
 */
export function usePortada(comunicadoId: string, hasPortada: boolean) {
  const query = useQuery({
    queryKey: CLAVES_COMUNICADOS.portada(comunicadoId),
    queryFn: () => urlPortada(comunicadoId),
    enabled: hasPortada,
    staleTime: 4 * 60 * 1000,
  });
  return {
    url: query.data?.url,
    cargando: query.isFetching,
    error: query.error,
  };
}
