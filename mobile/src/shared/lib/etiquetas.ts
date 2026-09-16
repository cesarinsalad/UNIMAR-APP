/**
 * Presentación de la audiencia de un recurso por decanatos.
 *
 * Regla de dominio compartida (contrato §5): lista vacía = GLOBAL — toda la
 * universidad. Con decanatos listados, solo a ellos. Aplica a comunicados
 * (Paso 3) y eventos OFICIALES (Paso 4).
 *
 * Nota: mientras no exista un catálogo cargable de decanatos se muestran los
 * ids numéricos; el catálogo ya existe en el BFF (GET /decanatos) y el
 * componente es quien le pasa nombres cuando los tiene.
 */
export function etiquetaAudiencia(decanatoIds: number[]): string {
  if (decanatoIds.length === 0) return 'Toda la universidad';
  const ids = decanatoIds.join(', ');
  return decanatoIds.length === 1 ? `Decanato ${ids}` : `Decanatos ${ids}`;
}