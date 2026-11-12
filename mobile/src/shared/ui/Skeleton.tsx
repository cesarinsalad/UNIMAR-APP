import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { colors, radius, spacing } from './theme';

/**
 * Placeholder de carga con pulso de opacidad. Sustituye al "Cargando..."
 * de texto plano: marca la estructura (cards/filas) mientras loadan colas
 * y listas. Respeta motion reducido (pulso estático). Funciona idéntico en
 * móvil y web (Animated core, no Reanimated).
 *
 * Es puramente visual: la región de carga se anuncia una sola vez con
 * `SkeletonGroup`, no placeholder por placeholder.
 */
export function Skeleton({
  style,
  redondo = false,
}: {
  style?: StyleProp<ViewStyle>;
  redondo?: boolean;
}) {
  const esReducido = useReducedMotion();
  const opacidad = useRef(new Animated.Value(esReducido ? 0.9 : 0.65)).current;

  useEffect(() => {
    if (esReducido) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidad, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacidad, {
          toValue: 0.65,
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
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[estilos.base, redondo && estilos.redondo, style, { opacity: opacidad }]}
    />
  );
}

/**
 * Región de carga accesible: agrupa los placeholders visuales y los anuncia
 * una sola vez. Evita que un lector de pantalla lea "Cargando" N veces.
 */
export function SkeletonGroup({
  children,
  label = 'Cargando contenido',
  style,
}: {
  children: ReactNode;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      accessibilityLiveRegion="polite"
      style={style}>
      {children}
    </View>
  );
}

/**
 * Bloque tipo card para colas de gestión: título + líneas de cuerpo.
 * `largo` es el total de líneas visibles (1 = solo el título). En desktop
 * se usan más líneas vía `largo`.
 */
export function SkeletonCard({ largo = 3 }: { largo?: number }) {
  const lineasCuerpo = Math.max(0, Math.min(largo, 4) - 1);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={estilos.card}>
      <Skeleton style={estilos.lineaTitulo} />
      {Array.from({ length: lineasCuerpo }, (_, indice) => (
        <Skeleton
          key={indice}
          style={[
            estilos.linea,
            lineasCuerpo > 1 && indice === lineasCuerpo - 1 && estilos.lineaCorta,
          ]}
        />
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    backgroundColor: colors.border.strong,
    borderRadius: radius.sm,
    height: 14,
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
    height: 18,
  },
  linea: {
    width: '85%',
  },
  lineaCorta: {
    width: '55%',
  },
});
