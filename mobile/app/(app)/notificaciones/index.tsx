import { SafeAreaView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { colors, spacing } from '@/shared/ui';
import { ThemedButton, ThemedText, ThemedView } from '@/shared/ui';
import { rutaParaNotificacion } from '@/shared/notifications';
import { useNoLeidas } from '@/features/notificaciones/hooks/useNoLeidas';
import { useMarcarLeida } from '@/features/notificaciones/hooks/useMarcarLeida';
import { useMarcarTodasLeidas } from '@/features/notificaciones/hooks/useMarcarTodasLeidas';
import { NotificacionesList } from '@/features/notificaciones/components/NotificacionesList';
import type { Notificacion } from '@/features/notificaciones/types';

export default function NotificacionesScreen() {
  const { data } = useNoLeidas();
  const marcarLeida = useMarcarLeida();
  const marcarTodas = useMarcarTodasLeidas();
  const total = data?.total ?? 0;

  function abrir(notificacion: Notificacion) {
    if (!notificacion.leida) {
      marcarLeida.mutate(notificacion.id);
    }
    const ruta = rutaParaNotificacion(notificacion.tipo, notificacion.referenciaId);
    if (ruta) {
      router.push(ruta as Parameters<typeof router.push>[0]);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ThemedView variant="base" style={styles.header}>
        <ThemedText variant="subtitle" weight="semibold">
          Bandeja
        </ThemedText>
        {total > 0 ? (
          <ThemedButton
            title="Marcar todo leído"
            variant="ghost"
            size="sm"
            loading={marcarTodas.isPending}
            onPress={() => marcarTodas.mutate()}
          />
        ) : null}
      </ThemedView>
      <View style={styles.contenido}>
        <NotificacionesList onAbrir={abrir} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.four,
    paddingTop: spacing.three,
    paddingBottom: spacing.three,
  },
  contenido: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
});