import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeftIcon, CheckIcon } from 'phosphor-react-native';

import { colors, radius, spacing, touchTarget, typography } from '@/shared/ui';
import { BotonCircular, ThemedText, ThemedView } from '@/shared/ui';
import { rutaParaNotificacion } from '@/shared/notifications';
import { useNoLeidas } from '@/features/notificaciones/hooks/useNoLeidas';
import { useMarcarLeida } from '@/features/notificaciones/hooks/useMarcarLeida';
import { useMarcarTodasLeidas } from '@/features/notificaciones/hooks/useMarcarTodasLeidas';
import { NotificacionesList } from '@/features/notificaciones/components/NotificacionesList';
import type { Notificacion } from '@/features/notificaciones/types';

/**
 * Bandeja de notificaciones: convención de detalle de la casa (el título
 * vive EN CONTENIDO, back circular flotante; la campana de la barra ya
 * trae el punto naranja). El resumen bajo el título ("N sin leer") y la
 * acción de lectura masiva forman una sola unidad de control: la acción
 * es texto quieto, no un botón fantasma que compita con el titular.
 */
export default function NotificacionesScreen() {
  const noLeidas = useNoLeidas();
  const marcarLeida = useMarcarLeida();
  const marcarTodas = useMarcarTodasLeidas();
  const total = noLeidas.data?.total ?? 0;

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
          administra ella; aquí no se vuelve a sumar). */}
      <View style={styles.filaControl}>
        <BotonCircular label="Volver" onPress={volver}>
          <ArrowLeftIcon size={20} color={colors.brand.primary} weight="bold" />
        </BotonCircular>
        {total > 0 ? (
          <AccionMarcarTodo
            pendiente={marcarTodas.isPending}
            onPress={() => marcarTodas.mutate()}
          />
        ) : null}
      </View>

      <View style={styles.bloqueTitulo}>
        <ThemedText variant="headline" weight="semibold">
          Notificaciones
        </ThemedText>
        <View style={styles.resumen}>
          {!noLeidas.isPending && total > 0 ? (
            <View style={styles.puntoResumen} />
          ) : null}
          {!noLeidas.isPending ? (
            <ThemedText
              variant="bodySm"
              weight={total > 0 ? 'medium' : 'regular'}
              tone="secondary">
              {total > 0 ? `${total} sin leer` : 'Todo leído'}
            </ThemedText>
          ) : null}
        </View>
      </View>

      <NotificacionesList onAbrir={abrir} />
    </ThemedView>
  );
}

function AccionMarcarTodo({
  pendiente,
  onPress,
}: {
  pendiente: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Marcar todas las notificaciones como leídas"
      accessibilityState={{ busy: pendiente, disabled: pendiente }}
      disabled={pendiente}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.accion, pressed && styles.accionPresionada]}>
      {pendiente ? (
        <ActivityIndicator size="small" color={colors.brand.primary} />
      ) : (
        <>
          <CheckIcon size={16} color={colors.brand.primary} weight="bold" />
          <ThemedText
            variant="bodySm"
            weight="semibold"
            style={styles.accionTexto}>
            Marcar todo leído
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  filaControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touchTarget.min,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  accion: {
    minHeight: touchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  accionPresionada: {
    opacity: 0.6,
  },
  accionTexto: {
    color: colors.brand.primary,
  },
  bloqueTitulo: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  resumen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    minHeight: typography.lineHeight.bodySm,
  },
  puntoResumen: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.accent.urgent,
  },
});
