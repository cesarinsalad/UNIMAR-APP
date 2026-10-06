import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, spacing } from './theme';
import { ThemedText } from './ThemedText';

export interface EmptyStateProps {
  title: string;
  message?: string;
  /** Icono o ilustración opcional sobre el título. */
  icon?: React.ReactNode;
  /** Acción opcional debajo del mensaje (botón ghost/secondary). */
  action?: React.ReactNode;
  style?: ViewStyle;
}

/** Estado vacío centrado: título, mensaje y acción opcional. */
export function EmptyState({ title, message, icon, action, style }: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <ThemedText variant="subtitle" weight="semibold" style={styles.title}>
        {title}
      </ThemedText>
      {message ? (
        <ThemedText variant="body" tone="secondary" style={styles.message}>
          {message}
        </ThemedText>
      ) : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  icon: { marginBottom: spacing.sm },
  title: { color: colors.text.primary },
  message: { textAlign: 'center', maxWidth: 360 },
});
