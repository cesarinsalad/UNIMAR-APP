import { useQuery } from '@tanstack/react-query';

import { listarMaterias } from '../api/academico.api';
import { CLAVES_ACADEMICO } from './queryKeys';

/**
 * Una sola query sin parámetro de período: la partición En curso/Historial
 * y el selector de período son filtrado local sobre los datos (helpers
 * puros). Asi la key es estable y el refetch del pull-to-refresh basta.
 */
export function useMaterias() {
  return useQuery({
    queryKey: CLAVES_ACADEMICO.materias,
    queryFn: () => listarMaterias(),
    staleTime: 5 * 60 * 1000,
  });
}
