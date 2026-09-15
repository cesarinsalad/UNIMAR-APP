import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { colors, radius, spacing } from '@/shared/ui';

type Variant = 'base' | 'elevated' | 'sunken' | 'card';

export interface ThemedViewProps extends ViewProps {
  variant?: Variant;
  padding?: keyof typeof spacing;
  style?: StyleProp<ViewStyle>;
}

export function ThemedView({
  variant = 'base',
  padding,
  style,
  children,
  ...rest
}: ThemedViewProps) {
  const variantStyle = VARIANT_STYLES[variant];
  return (
    <View {...rest} style={[styles.base, variantStyle, padding ? { padding: spacing[padding] } : null, style]}>
      {children}
    </View>
  );
}

const VARIANT_STYLES: Record<Variant, ViewStyle> = {
  base: { backgroundColor: colors.background.base },
  elevated: { backgroundColor: colors.background.elevated },
  sunken: { backgroundColor: colors.background.sunken },
  card: {
    backgroundColor: colors.background.base,
    borderRadius: radius.lg,
    padding: spacing.four,
  },
};

const styles = StyleSheet.create({
  base: { flexShrink: 1 },
});