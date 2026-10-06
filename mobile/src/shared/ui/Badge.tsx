import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from './theme';
import { ThemedText } from './ThemedText';

type Tone = 'info' | 'urgent';

export interface BadgeProps {
  label: string;
  /** `info`: brand/surface-blue con texto azul. `urgent`: accent/urgent con texto on-primary. */
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}

/**
 * Etiqueta compacta con esquinas completas (pill).
 * El tono `urgent` es el único uso permitido del naranja (STYLE.md §1.3).
 */
export function Badge({ label, tone = 'info', style }: BadgeProps) {
  const toneStyle = TONE_STYLES[tone];
  return (
    <View style={[styles.base, toneStyle.container, style]}>
      <ThemedText variant="caption" weight="medium" style={{ color: toneStyle.labelColor }}>
        {label}
      </ThemedText>
    </View>
  );
}

const TONE_STYLES: Record<Tone, { container: ViewStyle; labelColor: string }> = {
  info: {
    container: { backgroundColor: colors.brand.surfaceBlue },
    labelColor: colors.brand.primary,
  },
  urgent: {
    container: { backgroundColor: colors.accent.urgent },
    labelColor: colors.text.onPrimary,
  },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
});
