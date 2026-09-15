import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';
import type { Notificacion, TipoNotificacion } from '../types';

const ETIQUETAS_TIPO: Record<TipoNotificacion, string> = {
  COMUNICADO_PUBLICADO: 'Comunicado publicado',
  COMUNICADO_RECHAZADO: 'Comunicado rechazado',
  EVENTO_OFICIAL_CREADO: 'Nuevo evento oficial',
  EVENTO_RECORDATORIO: 'Recordatorio de evento',
  NOTA_PUBLICADA: 'Nota publicada',
};

const FORMATO_FECHA = new Intl.DateTimeFormat('es-VE', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

interface Props {
  notificacion: Notificacion;
  /** La pantalla decide qué hacer al tocar (marcar leída + deep-link). */
  onAbrir: (notificacion: Notificacion) => void;
}

export function NotificacionCard({ notificacion, onAbrir }: Props) {
  const noLeida = !notificacion.leida;

  return (
    <Pressable onPress={() => onAbrir(notificacion)} accessibilityRole="button">
      <ThemedView
        variant="card"
        style={[styles.card, noLeida && styles.noLeida]}>
        <View style={styles.headerRow}>
          <ThemedText variant="caption" tone="tertiary">
            {ETIQUETAS_TIPO[notificacion.tipo]}
          </ThemedText>
          {noLeida ? <View style={styles.puntoAcento} /> : null}
        </View>
        <ThemedText
          variant="body"
          weight={noLeida ? 'semibold' : 'regular'}
          numberOfLines={2}>
          {notificacion.titulo}
        </ThemedText>
        <ThemedText variant="body" tone="secondary" numberOfLines={2}>
          {notificacion.cuerpo}
        </ThemedText>
        <ThemedText variant="caption" tone="tertiary">
          {FORMATO_FECHA.format(new Date(notificacion.createdAt))}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.two,
  },
  noLeida: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  puntoAcento: {
    width: 8,
    height: 8,
    borderRadius: radius.pill / 2,
    backgroundColor: colors.accent,
  },
});