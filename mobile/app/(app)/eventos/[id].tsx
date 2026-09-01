import { StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { colors, spacing } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';

export default function EventoDetallePlaceholder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ThemedView variant="base" style={styles.container}>
      <ThemedText variant="title" weight="semibold">
        Evento {id}
      </ThemedText>
      <ThemedText tone="secondary">
        Deep-link recibido. El detalle del evento se implementa en el paso 4.
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