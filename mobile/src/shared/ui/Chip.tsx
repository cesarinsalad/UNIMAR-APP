import { Pressable, StyleSheet } from 'react-native';

import { colors, radius, spacing } from './theme';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

/**
 * Chip tonal estilo mock: pill con estado por peso óptico/TONO, no borde.
 * Activa = sunken (tinta azul, texto azul semibold); inactiva = tarjeta
 * blanca con elevación. El conteo/filtros los maneja el screen.
 */
export function Chip({
  etiqueta,
  activa,
  onPress,
  style,
}: {
  etiqueta: string;
  activa: boolean;
  onPress?: () => void;
  style?: object;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: activa }}
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, style as never]}>
      <ThemedView variant={activa ? 'elevated' : 'base'} style={estilos.chip}>
        <ThemedText
          variant="bodySm"
          weight={activa ? 'semibold' : 'medium'}
          style={{ color: activa ? colors.brand.primary : colors.text.primary }}>
          {etiqueta}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
});
