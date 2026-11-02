/**
 * Etiqueta de contador para el panel de gestión. La API no devuelve
 * total (arrays paginados sin meta), así que el panel cuenta la primera
 * página cargada; cuando la página viene llena, el conteo mostrado es la
 * cota del cap ("N+") en vez de un número engañosamente exacto.
 */
export function etiquetaConteo(cantidad: number, cap: number): string {
  return cantidad >= cap ? `${cap}+` : `${cantidad}`;
}
