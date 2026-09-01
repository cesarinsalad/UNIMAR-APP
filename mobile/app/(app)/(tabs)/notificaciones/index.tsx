import { StyleSheet } from 'react-native';

import { colors, spacing } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';

export default function NotificacionesTabPlaceholder() {
  return (
    <ThemedView variant="base" style={styles.container}>
      <ThemedText variant="title" weight="semibold">
        Bandeja
      </ThemedText>
      <ThemedText tone="secondary">
        La bandeja de notificaciones llega en el siguiente paso, con el registro
        de dispositivo push y la marca de leídas.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.four,
    gap: spacing.three,
    backgroundColor: colors.background.base,
  },
});