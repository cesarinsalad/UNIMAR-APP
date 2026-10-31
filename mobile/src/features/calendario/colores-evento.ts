import { PALETA_CALENDARIO_UNIMAR, type TipoEventoCalendario } from '@/shared/ui';
import type { Evento } from './types';

/**
 * Etiqueta visual de un evento: traduce el `tipo` del wire a las 5
 * naturalezas de PALETA_CALENDARIO_UNIMAR. Solo cambia la presentación,
 * nunca el dato: los OFICIALES se despliegan según su audiencia (global
 * → CAMPUS, verde; por decanatos → DECANATO, dorado) leyendo `decanatoIds`
 * que ya viaja en el DTO — sin tocar backend ni el wire.
 */
export function clasificarEventoVisual(
  evento: Pick<Evento, 'tipo' | 'decanatoIds'>,
): TipoEventoCalendario {
  if (evento.tipo === 'OFICIAL') {
    return evento.decanatoIds.length === 0 ? 'CAMPUS' : 'DECANATO';
  }
  return evento.tipo; // PERSONAL/INSTITUCIONAL/FERIADO comparten clave con la paleta.
}


/** Orden canónico de los puntos del grid (de "campus" a personal). */
export const ORDEN_PUNTOS: readonly TipoEventoCalendario[] = [
  'INSTITUCIONAL',
  'CAMPUS',
  'DECANATO',
  'FERIADO',
  'PERSONAL',
];

export function nombreVisual(tipo: TipoEventoCalendario): string {
  return PALETA_CALENDARIO_UNIMAR[tipo].nombre;
}
