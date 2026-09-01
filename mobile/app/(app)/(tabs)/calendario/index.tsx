import { StyleSheet } from 'react-native';

import { colors, spacing } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';

export default function CalendarioTabPlaceholder() {
  return (
    <ThemedView variant="base" style={styles.container}>
      <ThemedText variant="title" weight="semibold">
        Calendario
      </ThemedText>
      <ThemedText tone="secondary">
        Agenda mixta (eventos oficiales + personales) en el siguiente paso.
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