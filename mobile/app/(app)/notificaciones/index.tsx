import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeftIcon } from 'phosphor-react-native';

import { colors, spacing } from '@/shared/ui';
import { BotonCircular, ThemedButton, ThemedText, ThemedView } from '@/shared/ui';
import { rutaParaNotificacion } from '@/shared/notifications';
import { useNoLeidas } from '@/features/notificaciones/hooks/useNoLeidas';
import { useMarcarLeida } from '@/features/notificaciones/hooks/useMarcarLeida';
import { useMarcarTodasLeidas } from '@/features/notificaciones/hooks/useMarcarTodasLeidas';
import { NotificacionesList } from '@/features/notificaciones/components/NotificacionesList';
import type { Notificacion } from '@/features/notificaciones/types';

/**
 * Bandeja de notificaciones: convención de detalle de la casa (el título
 * vive EN CONTENIDO, back circular flotante; la campana de la barra ya
 * trae el punto naranja). Sobre superficie clara el botón configurable
 * ("Marcar todo leído") puede ser ghost — sobre la franja azul anterior
 * su etiqueta azul era invisible sobre azul.
 */
export default function NotificacionesScreen() {
  const { data } = useNoLeidas();
  const marcarLeida = useMarcarLeida();
  const marcarTodas = useMarcarTodasLeidas();
  const total = data?.total ?? 0;

  function volver() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

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
    <ThemedView variant="base" style={styles.pantalla}>
      {/* Fila de control bajo la BarraInstitucional (el inset superior la
          administra ella; aquí no se vuelve a sumar) + headline en contenido. */}
      <View style={styles.cabecera}>
        <View style={styles.filaControl}>
          <BotonCircular label="Volver" onPress={volver}>
            <ArrowLeftIcon size={20} color={colors.brand.primary} weight="bold" />
          </BotonCircular>
          {total > 0 ? (
            <ThemedButton
              title="Marcar todo leído"
              variant="ghost"
              size="sm"
              loading={marcarTodas.isPending}
              onPress={() => marcarTodas.mutate()}
            />
          ) : null}
        </View>
        <ThemedText variant="headline" weight="semibold" style={styles.titulo}>
          Notificaciones
        </ThemedText>
      </View>
      <NotificacionesList onAbrir={abrir} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  cabecera: {
    gap: spacing.md,
  },
  filaControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  titulo: {
    paddingHorizontal: spacing.lg,
  },
});
