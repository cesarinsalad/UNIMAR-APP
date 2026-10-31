import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/shared/ui';
import { ThemedText } from '@/shared/ui';
import { colorBarra } from './tonos-barra';

/**
 * Leyenda de la simbología de materias en curso: dos muestras de la
 * barra lateral (misma receta de MateriaActualCard: 3px, radius.pill,
 * tonos de tonos-barra) con su significado — sólida = clase hoy, tenue =
 * sin clase hoy. Vive bajo el eyebrow "MATERIAS EN CURSO" y sobre las
 * cards: cierra a la proximidad de lo que explica. Solo se monta cuando
 * hay franjas (sin horarios la barra siempre es sólida y la leyenda
 * mentiría). Las barras de las cards son decorativas (sin accesibilidad):
 * esta fila es quien las hace interpretables para el lector de pantalla.
 */
export function LeyendaActivo() {
  return (
    <View
      style={estilos.fila}
      accessibilityRole="text"
      accessibilityLabel="Leyenda: barra sólida, la materia tiene clase hoy; barra tenue, no tiene clase hoy">
      <ItemLeyenda etiqueta="Clase hoy" activo />
      <ItemLeyenda etiqueta="Sin clase hoy" activo={false} />
    </View>
  );
}

function ItemLeyenda({ etiqueta, activo }: { etiqueta: string; activo: boolean }) {
  return (
    <View style={estilos.item}>
      <View style={[estilos.muestra, { backgroundColor: colorBarra(activo) }]} />
      <ThemedText variant="caption" tone="secondary">
        {etiqueta}
      </ThemedText>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // Misma geometría de la barra de MateriaActualCard: el muestrario usa
  // la altura de una línea de caption para verse como la firma real.
  muestra: {
    width: 3,
    height: 14,
    borderRadius: radius.pill,
  },
});
