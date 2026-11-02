import { useWindowDimensions } from 'react-native';

/** Umbral tablet/desktop: pantallas anchas merecen layout de dos columnas. */
const UMBRAL_DESKTOP = 768;

/**
 * true si la ventana tiene ancho de escritorio (≥ 768 px). En nativo solo
 * tablets/large phones; en web es el caso normal del staff de escritorio.
 * Escucha cambios de tamaño (rotación, resize de ventana del navegador).
 */
export function useEsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return width >= UMBRAL_DESKTOP;
}
