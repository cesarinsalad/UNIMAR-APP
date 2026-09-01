import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { colors, elevation, radius, spacing, typography } from '@/shared/ui';
import { ThemedText } from './ThemedText';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

export interface ThemedButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function ThemedButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
}: ThemedButtonProps) {
  const sizeStyles = SIZE_STYLES[size];
  const variantStyles = VARIANT_STYLES[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyles.container,
        variantStyles.container,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variantStyles.labelColor} />
      ) : (
        <ThemedText
          variant={size === 'lg' ? 'bodyLg' : 'body'}
          weight="semibold"
          style={{ color: variantStyles.labelColor }}>
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

const SIZE_STYLES: Record<Size, { container: ViewStyle }> = {
  sm: {
    container: {
      paddingHorizontal: spacing.three,
      paddingVertical: spacing.two,
    },
  },
  md: {
    container: {
      paddingHorizontal: spacing.four,
      paddingVertical: spacing.three,
    },
  },
  lg: {
    container: {
      paddingHorizontal: spacing.six,
      paddingVertical: spacing.four,
    },
  },
};

const VARIANT_STYLES: Record<Variant, { container: ViewStyle; labelColor: string }> = {
  primary: {
    container: {
      backgroundColor: colors.primary,
      ...elevation.sm,
    },
    labelColor: colors.text.onPrimary,
  },
  secondary: {
    container: {
      backgroundColor: colors.background.elevated,
      borderWidth: 1,
      borderColor: colors.border.subtle,
    },
    labelColor: colors.text.primary,
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
    },
    labelColor: colors.primary,
  },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
});

export const _internal = { radius, typography };