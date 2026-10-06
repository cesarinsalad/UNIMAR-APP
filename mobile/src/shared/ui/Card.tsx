import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { colors, elevation, highlight, radius, spacing } from './theme';

export interface CardProps {
  children?: React.ReactNode;
  highlight?: boolean;
  padding?: keyof typeof spacing;
  elevationKey?: keyof typeof elevation;
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
  elevationKey = 'sm',
  style,
}: CardProps) {
  const elev = elevation[elevationKey];
  return (
    <View style={[styles.base, elev, conHighlight ? highlight[elevationKey] : null, { padding: spacing[padding] }, style]}>
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
    borderRadius: radius.lg,
  },
  pressed: {
    opacity: 0.85,
  },
});
