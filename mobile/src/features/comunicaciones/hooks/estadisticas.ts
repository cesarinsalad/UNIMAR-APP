import { useQuery } from '@tanstack/react-query';

import { estadisticasComunicado } from '../api/comunicados.api';
import type { Rol } from '@/features/identidad/types';

/**
 * RBAC de estadísticas — espejo de EstadisticasComunicado del BFF:
 * autor o ADMIN. Función pura separada de accionesPermitidas para no
 * mutar sus fixtures de test (toEqual).
 */
export function puedeVerEstadisticas(rol: Rol | null, esAutor: boolean): boolean {
  if (!rol) return false;
  return rol === 'ADMIN' || esAutor;
}

/** "1 lectura" / "N lecturas". */
export function etiquetaLecturas(n: number): string {
  return n === 1 ? '1 lectura' : `${n} lecturas`;
}

/**
 * Contador de lecturas del comunicado. `enabled` evita que un usuario sin
 * permiso dispare la petición (que sería 403 a seguro).
 */
export function useEstadisticas(comunicadoId: string, habilitado: boolean) {
  return useQuery({
    queryKey: ['comunicados', 'estadisticas', comunicadoId],
    queryFn: () => estadisticasComunicado(comunicadoId),
    enabled: habilitado,
    staleTime: 60 * 1000,
  });
}
