/**
 * Presentación de la audiencia de un comunicado.
 *
 * Regla de dominio (contrato §5): `decanatoIds: []` significa GLOBAL —
 * dirigido a toda la universidad. Con decanatos listados, solo a ellos.
 */
export { etiquetaAudiencia } from '@/shared/lib/etiquetas';

/**
 * Chip de estado, solo visible si el comunicado no está PUBLICADO (decisión
 * de diseño del 3b: un chip PUBLICADO en el feed público sería ruido).
 * Devuelve null para indicar "no renderizar chip".
 */
import type { EstadoComunicado } from './types';

export function chipEstado(estado: EstadoComunicado): string | null {
  switch (estado) {
    case 'BORRADOR':
      return 'Borrador';
    case 'PENDIENTE':
      return 'Pendiente de aprobación';
    case 'ARCHIVADO':
      return 'Archivado';
    case 'PUBLICADO':
      return null;
  }
}