import { useWindowDimensions } from 'react-native';

/** Umbral tablet: Angostos largos reciben cards, anchos reciben tabla. */
export const UMBRAL_TABLET = 768;

/** Umbral escritorio: disposiciones amplias (sidebar, KPIs en fila). */
export const UMBRAL_ESCRITORIO = 1024;

export type Breakpoint = 'movil' | 'tablet' | 'escritorio';

/**
 * Función pura (testeable): el breakpoint que da un ancho de ventana.
 * - `movil` < 768: tarjetas verticales + bottom sheets + segmented control.
 * - `tablet` 768–1023: tablas de datos pero chrome compacto (sin sidebar).
 * - `escritorio` >= 1024: sidebar, KPIs en fila y modales anchos.
 */
export function breakpointDesdeAncho(width: number): Breakpoint {
  if (width >= UMBRAL_ESCRITORIO) return 'escritorio';
  if (width >= UMBRAL_TABLET) return 'tablet';
  return 'movil';
}

/**
 * Breakpoint reactivo de la ventana (escucha rotación/resize). La consola
 * de gestión es el consumidor de los 3 niveles; el resto de la app sigue
 * con `useEsDesktop` (≥ 768, binario).
 */
export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  return breakpointDesdeAncho(width);
}
