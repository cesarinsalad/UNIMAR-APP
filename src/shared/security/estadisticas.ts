import type { Claims } from './jwt';
import { ForbiddenError } from '../errors';

/**
 * Política compartida de acceso a estadísticas de contenido gestionado
 * (conteos de lecturas de comunicados, agendas de eventos).
 *
 * Regla del producto: quien puede *gestionar* un recurso puede ver sus
 * métricas. Es el ADMIN; el creador; o el COMUNICADOR cuyo decanato pertenece
 * a la audiencia del recurso — el mandate del thesis: el comunicador gestiona
 * lo de su decanato, y las stats de su decanato son su panel. Audiencia
 * global ([] = toda la universidad) queda al alcance de cualquiera con rol
 * COMUNICADOR porque gestiona el canal institucional completo.
 */
export function puedeVerEstadisticas(params: {
  claims: Claims;
  /** Autor del comunicado / creador del evento (usuarioId). */
  dueño: string;
  /** Audiencia por decanato ([] = GLOBAL). */
  audienciaIds: number[];
}): boolean {
  const { claims, dueño, audienciaIds } = params;
  if (claims.role === 'ADMIN') return true;
  if (claims.sub === dueño) return true;
  if (claims.role !== 'COMUNICADOR') return false;
  if (audienciaIds.length === 0) return true;
  return claims.decanato_id !== null && audienciaIds.includes(claims.decanato_id);
}

/** Lanza 403 si la política no habilita al claim. */
export function exigirEstadisticas(params: {
  claims: Claims;
  dueño: string;
  audienciaIds: number[];
}): void {
  if (!puedeVerEstadisticas(params)) {
    throw new ForbiddenError('No puedes ver estadísticas de este recurso');
  }
}
