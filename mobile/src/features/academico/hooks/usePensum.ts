import { useQuery } from '@tanstack/react-query';

import { getPensum } from '../api/academico.api';
import { CLAVES_ACADEMICO } from './queryKeys';

/**
 * Pénsum de la carrera. Catálogo casi inmutable → staleTime 24h (como
 * decanatos). El `enabled` evita la llamada sin id (sería 400 del BFF).
 */
export function usePensum(carreraId: string | null) {
  return useQuery({
    queryKey: CLAVES_ACADEMICO.pensum(carreraId ?? ''),
    queryFn: () => getPensum(carreraId!),
    enabled: carreraId !== null && carreraId.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
