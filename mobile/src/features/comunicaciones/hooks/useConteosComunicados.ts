import { useQuery } from '@tanstack/react-query';

import { conteosComunicados, type ConteosComunicados } from '../api/comunicados.api';
import { CLAVES_COMUNICADOS } from './queryKeys';

/**
 * Números exactos de comunicados por estado (borradores, pendientes,
 * archivados) que el ADMIN/comunicador puede ver — RLS recorta el GROUP BY
 * igual que las colas. Cero llamadas de página; invalidación por el prefijo
 * ['comunicados'] cuando cualquier mutación de comunicados tiene éxito.
 *
 * Estado de llegada: `conteos === undefined` mientras carga; `error`
 * distinto de null si el endpoint no existe aún (BFF viejo sin este
 * deploy) o falló — la UI degrada a "—" en vez de quedarse en "…" eterno.
 */
export function useConteosComunicados(): {
  conteos: ConteosComunicados | undefined;
  cargando: boolean;
  error: unknown;
  refetch: () => void;
} {
  const query = useQuery({
    queryKey: CLAVES_COMUNICADOS.conteos,
    queryFn: conteosComunicados,
    retry: false,
  });
  return {
    conteos: query.data,
    cargando: query.isPending,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}
