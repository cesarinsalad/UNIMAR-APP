export type ValorBadge = number | '99+' | undefined;

export const UMBRAL_BADGE = 99;

/**
 * Regla del badge de no-leídas: 0 → sin badge, 1–99 → número, ≥100 → '99+'.
 */
export function formatearBadge(total: number | undefined): ValorBadge {
  if (total === undefined || total <= 0) return undefined;
  if (total > UMBRAL_BADGE) return '99+';
  return total;
}