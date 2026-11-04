import { useQuery } from '@tanstack/react-query';

import { estadisticasEvento } from '../api/eventos.api';
import type { Rol } from '@/features/identidad/types';

/**
 * RBAC de estadísticas de eventos — espejo del shared kernel
 * `puedeVerEstadisticas` del BFF: ADMIN, el creador, o el COMUNICADOR cuyo
 * decanato está en la audiencia (audiencia global [] = entre comunicadores).
 * El cliente nunca decide el permiso final: solo evita disparar peticiones
 * 403-aseguro. Espeja `puedeVerEstadisticas` del módulo comunicaciones
 * (frontera de features: cada módulo lleva su copia del contrato).
 */
export function puedeVerEstadisticasEvento(
  rol: Rol | null,
  esDueño: boolean,
  audienciasDecanato: number[],
  decanatoPropio: number | null,
): boolean {
  if (!rol) return false;
  if (rol === 'ADMIN') return true;
  if (esDueño) return true;
  if (rol !== 'COMUNICADOR') return false;
  if (audienciasDecanato.length === 0) return true;
  return decanatoPropio !== null && audienciasDecanato.includes(decanatoPropio);
}

/** "1 en agenda" / "N en agenda" (conteo de `evento_participantes`). */
export function etiquetaParticipantes(n: number): string {
  return n === 1 ? '1 en agenda' : `${n} en agenda`;
}

/**
 * Conteo de agendas opt-in. `enabled` evita que un usuario sin permiso
 * dispare la petición (que sería 403 a seguro).
 */
export function useEstadisticasEvento(eventoId: string, habilitado: boolean) {
  return useQuery({
    queryKey: ['eventos', 'estadisticas', eventoId],
    queryFn: () => estadisticasEvento(eventoId),
    enabled: habilitado,
    staleTime: 60 * 1000,
  });
}
