import { useQuery } from '@tanstack/react-query';

import { obtenerMateria } from '../api/academico.api';
import { CLAVES_ACADEMICO } from './queryKeys';

/**
 * Detalle de una materia por id. staleTime 60s como los demás detalles
 * (comunicados, eventos): la ida y vuelta no repite el GET en 1 minuto.
 */
export function useMateriaDetalle(id: string) {
  return useQuery({
    queryKey: CLAVES_ACADEMICO.materia(id),
    queryFn: () => obtenerMateria(id),
    staleTime: 60 * 1000,
  });
}
