import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { colors, radius, spacing } from './theme';

/**
 * Placeholder de carga con pulso de opacidad. Sustituye al "Cargando..."
 * de texto plano: marca la estructura (cards/filas) mientras loadan colas
 * y listas. Respeta motion reducido (pulso estático al 70%). Funciona
 * idéntico en móvil y web (Animated core, no Reanimated).
 */
export function Skeleton({
  style,
  redondo = false,
}: {
  style?: StyleProp<ViewStyle>;
  redondo?: boolean;
}) {
  const esReducido = useReducedMotion();
  const opacidad = useRef(new Animated.Value(esReducido ? 0.7 : 0.45)).current;

  useEffect(() => {
    if (esReducido) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidad, {
          toValue: 0.95,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacidad, {
          toValue: 0.45,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [esReducido, opacidad]);

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando"
      style={[estilos.base, redondo && estilos.redondo, style, { opacity: opacidad }]}
    />
  );
}

/**
 * Bloque tipo card para colas de gestión: título + meta + (línea opcional).
 * En desktop se usan más anchos/largos vía `largo`.
 */
export function SkeletonCard({ largo = 3 }: { largo?: number }) {
  return (
    <View style={estilos.card}>
      <Skeleton style={estilos.lineaTitulo} />
      <Skeleton style={estilos.linea} />
      {largo > 2 ? <Skeleton style={[estilos.linea, estilos.lineaCorta]} /> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    backgroundColor: colors.brand.surfaceBlue,
    borderRadius: radius.sm,
    height: 12,
  },
  redondo: {
    borderRadius: radius.pill,
  },
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.bg.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.subtle,
  },
  lineaTitulo: {
    width: '60%',
    height: 16,
  },
  linea: {
    width: '85%',
  },
  lineaCorta: {
    width: '55%',
  },
});
