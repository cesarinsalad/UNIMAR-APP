import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { colors, radius, spacing } from './theme';
import { ThemedText } from './ThemedText';

/**
 * Chip tonal estilo mock: pill con estado por peso óptico/TONO, no borde.
 * Activa = sunken (tinta azul, texto azul semibold); inactiva = tarjeta
 * blanca. El tinte cruza con una transición CSS de 150ms y el press
 * respira con scale 0.97 (120ms) — degradando a opacidad con motion
 * reducido. El conteo/filtros los maneja el screen.
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
  const [presionada, setPresionada] = useState(false);
  const reducido = useReducedMotion();

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: activa }}
      onPress={onPress}
      pressRetentionOffset={16}
      onPressIn={() => setPresionada(true)}
      onPressOut={() => setPresionada(false)}>
      <Animated.View
        style={[
          estilos.chip,
          !reducido && estilos.transicion,
          activa ? estilos.activa : estilos.inactiva,
          presionada && (reducido ? estilos.presionReducida : estilos.presionada),
          style,
        ]}>
        <ThemedText
          variant="bodySm"
          weight={activa ? 'semibold' : 'medium'}
          style={{ color: activa ? colors.brand.primary : colors.text.primary }}>
          {etiqueta}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    transform: [{ scale: 1 }],
  },
  transicion: {
    transitionProperty: 'transform, background-color',
    transitionDuration: '150ms',
    transitionTimingFunction: 'ease-in-out',
  },
  activa: { backgroundColor: colors.brand.surfaceBlue },
  inactiva: { backgroundColor: colors.bg.surface },
  presionada: { transform: [{ scale: 0.97 }] },
  presionReducida: { opacity: 0.85 },
});
