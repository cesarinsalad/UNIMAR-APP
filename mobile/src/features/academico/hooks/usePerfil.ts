import { useQuery } from '@tanstack/react-query';

import { getPerfil } from '../api/academico.api';
import { CLAVES_ACADEMICO } from './queryKeys';

/**
 * Perfil académico del usuario. staleTime 5 min: los datos vienen de la
 * API UNIMAR vía BFF (que ya cachea 10 min server-side), no cambian al
 * navegar de ida y vuelta.
 */
export function usePerfil() {
  return useQuery({
    queryKey: CLAVES_ACADEMICO.perfil,
    queryFn: getPerfil,
    staleTime: 5 * 60 * 1000,
  });
}
