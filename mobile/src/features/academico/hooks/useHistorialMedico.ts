import { useQuery } from '@tanstack/react-query';

import { getHistorialMedico } from '../api/academico.api';
import { CLAVES_ACADEMICO } from './queryKeys';

/**
 * Historial médico del estudiante. Trato normal de caché (decisión 5d):
 * vive solo en memoria volátil y muere con el logout, igual que el resto
 * del módulo. Sin `enabled` condicional: cualquiera autenticado puede
 * intentarlo y el 403 lo decide el servidor.
 */
export function useHistorialMedico() {
  return useQuery({
    queryKey: CLAVES_ACADEMICO.historial,
    queryFn: getHistorialMedico,
  });
}
