/**
 * Formatos de fecha compartidos (Intl es-VE). Centralizados aquí porque
 * ColasSeccion, EventosSeccion y ComunicadoCard los declaraban iguales.
 */
export const FORMATO_FECHA_MEDIO = new Intl.DateTimeFormat('es-VE', {
  dateStyle: 'medium',
});

export const FORMATO_FECHA_CORTO_CON_DIA = new Intl.DateTimeFormat('es-VE', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
