import { useQuery } from '@tanstack/react-query';

import { estadisticasComunicado } from '../api/comunicados.api';
import type { Rol } from '@/features/identidad/types';

/**
 * RBAC de estadísticas — espejo del shared kernel `puedeVerEstadisticas`
 * del BFF: ADMIN, el autor, o el COMUNICADOR cuyo decanato está en la
 * audiencia (audiencia global [] = entre comunicadores). El cliente nunca
 * decide el permiso final: solo evita disparar peticiones 403-aseguro.
 */
export function puedeVerEstadisticas(
  rol: Rol | null,
  esAutor: boolean,
  audienciasDecanato: number[],
  decanatoPropio: number | null,
): boolean {
  if (!rol) return false;
  if (rol === 'ADMIN') return true;
  if (esAutor) return true;
  if (rol !== 'COMUNICADOR') return false;
  if (audienciasDecanato.length === 0) return true;
  return decanatoPropio !== null && audienciasDecanato.includes(decanatoPropio);
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
