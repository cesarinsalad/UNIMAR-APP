import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { colors, elevation, highlight, radius, spacing } from './theme';

export interface CardProps {
  children?: React.ReactNode;
  highlight?: boolean;
  padding?: keyof typeof spacing;
  /** Padding horizontal; si se omite usa `padding` (regla: ≥ vertical). */
  paddingH?: keyof typeof spacing;
  /** Padding vertical; si se omite usa `padding` (regla: ≤ horizontal). */
  paddingV?: keyof typeof spacing;
  elevationKey?: keyof typeof elevation;
  /**
   * File-rule institucional: barra superior 3px color-estado que convierte
   * la tarjeta en "expediente" (firma del sistema). null = sin barra.
   */
  fileRule?: string | null;
  style?: StyleProp<ViewStyle>;
}

/**
 * Superficie blanca con sombra neutral y resplandor superior.
 * Variante estática; para presionable usar `PressableCard`.
 */
export function Card({
  children,
  highlight: conHighlight = true,
  padding = 'lg',
  paddingH,
  paddingV,
  elevationKey = 'sm',
  fileRule,
  style,
}: CardProps) {
  const elev = elevation[elevationKey];
  return (
    <View
      style={[
        styles.base,
        elev,
        conHighlight ? highlight[elevationKey] : null,
        {
          padding: spacing[padding],
          paddingHorizontal: paddingH ? spacing[paddingH] : undefined,
          paddingVertical: paddingV ? spacing[paddingV] : undefined,
        },
        style,
      ]}>
      {fileRule ? <View style={[styles.fileRule, { backgroundColor: fileRule }]} /> : null}
      {children}
    </View>
  );
}

export interface PressableCardProps extends Omit<PressableProps, 'children' | 'style'> {
  children?: React.ReactNode;
  highlight?: boolean;
  padding?: keyof typeof spacing;
  style?: StyleProp<ViewStyle>;
}

/** Tarjeta presionable con feedback táctil (ripple + elevación al presionar). */
export function PressableCard({
  children,
  highlight: conHighlight = true,
  padding = 'lg',
  style,
  ...rest
}: PressableCardProps) {
  return (
    <Pressable
      {...rest}
      android_ripple={{ color: colors.brand.surfaceBlue }}
      style={({ pressed }) => [
        styles.base,
        elevation.sm,
        conHighlight ? highlight.sm : null,
        { padding: spacing[padding] },
        pressed && styles.pressed,
        style,
      ]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.card,
  },
  fileRule: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
  },
  pressed: {
    opacity: 0.85,
  },
});
