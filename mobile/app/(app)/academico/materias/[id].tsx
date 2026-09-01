import { StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { colors, spacing } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';

export default function MateriaDetallePlaceholder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ThemedView variant="base" style={styles.container}>
      <ThemedText variant="title" weight="semibold">
        Materia {id}
      </ThemedText>
      <ThemedText tone="secondary">
        Deep-link recibido. El detalle de la materia (discriminado por es_actual) se
        implementa en el paso 5.
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