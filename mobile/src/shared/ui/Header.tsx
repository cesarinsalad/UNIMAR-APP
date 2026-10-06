import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, spacing } from './theme';
import { ThemedText } from './ThemedText';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  /** Acciones a la derecha (botones, avatar). */
  actions?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Barra superior en Azul Corporativo con título Montserrat.
 * Para pantallas sin header nativo del Stack.
 */
export function Header({ title, subtitle, actions, style }: HeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.textos}>
        <ThemedText variant="title" weight="semibold" tone="onPrimary" numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText variant="caption" tone="onPrimary" style={styles.subtitle}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  textos: { flexShrink: 1, gap: spacing.xs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  subtitle: { opacity: 0.8 },
});
