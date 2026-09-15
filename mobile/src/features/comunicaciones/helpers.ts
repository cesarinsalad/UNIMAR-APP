/**
 * Presentación de la audiencia de un comunicado.
 *
 * Regla de dominio (contrato §5): `decanatoIds: []` significa GLOBAL —
 * dirigido a toda la universidad. Con decanatos listados, solo a ellos.
 *
 * Nota: mientras no exista el catálogo de decanatos (GET /decanatos,
 * pendiente de agregar al BFF) se muestran los ids numéricos; cuando el
 * catálogo esté disponible esta función cambiará ids por nombres.
 */
export function etiquetaAudiencia(decanatoIds: number[]): string {
  if (decanatoIds.length === 0) return 'Toda la universidad';
  const ids = decanatoIds.join(', ');
  return decanatoIds.length === 1 ? `Decanato ${ids}` : `Decanatos ${ids}`;
}