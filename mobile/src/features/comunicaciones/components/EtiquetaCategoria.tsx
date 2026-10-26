import { StyleSheet } from 'react-native';

import { colors, ThemedText } from '@/shared/ui';
import type { typography } from '@/shared/ui';
import { etiquetaCategoria } from '../helpers';
import type { Comunicado } from '../types';

/** Peso tipográfico disponible (mapeo Montserrat de theme.typography). */
type Peso = keyof typeof typography.weight;
/** Tinta: el mismo oscuro que usan los titulares (colors.text.primary). */
type ColorEtiqueta = 'primario' | 'tinta';

/**
 * Etiqueta de categoría de una noticia SIN pill.
 * Defaults: Montserrat 300 en el color primario (azul), como la pide la
 * marca.
 * `mayusculas` (fila editorial): eyebrow mayúscula con tracking.
 * `peso`/`color` permiten ajustar cada consumo sin tocar el default
 * (p. ej. la fila editorial usa peso=regular + tinta para empatar con el
 * titular).
 * `sobreImagen` (tarjeta destacada): el azul no contrasta sobre la
 * portada, así que la etiqueta pasa a onPrimary y la legibilidad la
 * apoya una sombra suave; sigue sin fondo (sin pill).
 */
export function EtiquetaCategoria({
  comunicado,
  mayusculas = false,
  sobreImagen = false,
  peso = 'light',
  color = 'primario',
}: {
  comunicado: Pick<Comunicado, 'categoria' | 'decanatoIds'>;
  mayusculas?: boolean;
  sobreImagen?: boolean;
  peso?: Peso;
  color?: ColorEtiqueta;
}) {
  return (
    <ThemedText
      variant="caption"
      weight={peso}
      style={[
        sobreImagen ? estilos.sobreImagen : color === 'tinta' ? estilos.tinta : estilos.base,
        mayusculas && estilos.mayusculas,
      ]}>
      {etiquetaCategoria(comunicado)}
    </ThemedText>
  );
}

const estilos = StyleSheet.create({
  base: {
    color: colors.brand.primary,
  },
  tinta: {
    color: colors.text.primary,
  },
  mayusculas: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sobreImagen: {
    color: colors.text.onPrimary,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
