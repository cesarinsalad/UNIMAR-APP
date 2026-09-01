import { ScrollView, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/shared/ui';
import { ThemedButton, ThemedText, ThemedView } from '@/shared/ui';
import { useSesionStore } from '@/features/identidad/store/sesion.store';

export default function HomeScreen() {
  const usuario = useSesionStore((s) => s.usuario);
  const logout = useSesionStore((s) => s.logout);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <ThemedView variant="card" style={styles.card}>
        <ThemedText variant="caption" tone="secondary">
          Sesión activa
        </ThemedText>
        <ThemedText variant="title" weight="semibold">
          {usuario?.nombre ?? 'Sin sesión'}
        </ThemedText>
        <ThemedText variant="body" tone="secondary">
          Rol: {usuario?.rol ?? '—'} · Decanato: {usuario?.decanato_id ?? '—'}
        </ThemedText>
      </ThemedView>

      <View style={styles.gap}>
        <ThemedText variant="subtitle" weight="semibold">
          Bienvenido a UNIMARapp
        </ThemedText>
        <ThemedText tone="secondary">
          Esta es la pantalla de inicio. En el siguiente paso conectaremos los
          módulos de comunicados, calendario y académico con sus endpoints del BFF.
        </ThemedText>
      </View>

      <ThemedButton title="Cerrar sesión" variant="secondary" onPress={() => void logout()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.four,
    gap: spacing.six,
    backgroundColor: colors.background.base,
  },
  card: {
    gap: spacing.two,
  },
  gap: {
    gap: spacing.three,
  },
});