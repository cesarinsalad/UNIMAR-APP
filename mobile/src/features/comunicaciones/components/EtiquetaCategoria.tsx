import { StyleSheet } from 'react-native';

import { colors, ThemedText } from '@/shared/ui';
import { etiquetaCategoria } from '../helpers';
import type { Comunicado } from '../types';

/**
 * Etiqueta de categoría de una noticia SIN pill: texto liviano
 * (Montserrat 300) en el color primario.
 * `mayusculas` (fila editorial): eyebrow mayúscula con tracking, estilo
 * sección de portada de noticias.
 * `sobreImagen` (tarjeta destacada): el azul no contrasta sobre la
 * portada, así que la etiqueta pasa a onPrimary y la legibilidad la
 * apoya una sombra suave; sigue sin fondo (sin pill).
 */
export function EtiquetaCategoria({
  comunicado,
  mayusculas = false,
  sobreImagen = false,
}: {
  comunicado: Pick<Comunicado, 'categoria' | 'decanatoIds'>;
  mayusculas?: boolean;
  sobreImagen?: boolean;
}) {
  return (
    <ThemedText
      variant="caption"
      weight="light"
      style={[
        sobreImagen ? estilos.sobreImagen : estilos.base,
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
