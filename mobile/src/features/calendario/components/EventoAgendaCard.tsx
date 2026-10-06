import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { MapPin } from 'phosphor-react-native';

import { colors, radius, spacing } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';
import type { Evento } from '../types';

const FORMATO_HORA = new Intl.DateTimeFormat('es-VE', { timeStyle: 'short' });
const FORMATO_MES = new Intl.DateTimeFormat('es-VE', { month: 'short' });

/**
 * Tarjeta de evento próximo del Home: bloque de fecha (día número + mes
 * abreviado en surface-blue), título y fila de lugar/hora con MapPin.
 * Presionable → detalle del evento.
 */
export function EventoAgendaCard({ evento }: { evento: Evento }) {
  const fecha = new Date(evento.inicioAt);

  function abrir() {
    router.push(`/eventos/${evento.id}` as Parameters<typeof router.push>[0]);
  }

  return (
    <Pressable onPress={abrir} accessibilityRole="button">
      <ThemedView variant="card" style={estilos.card}>
        <View style={estilos.fecha}>
          <ThemedText variant="subtitle" weight="bold" style={estilos.dia}>
            {fecha.getDate()}
          </ThemedText>
          <ThemedText variant="caption" weight="semibold" style={estilos.mes}>
            {FORMATO_MES.format(fecha).replace('.', '').toUpperCase()}
          </ThemedText>
        </View>
        <View style={estilos.textos}>
          <ThemedText variant="body" weight="semibold" numberOfLines={1}>
            {evento.titulo}
          </ThemedText>
          <View style={estilos.meta}>
            {evento.lugar ? (
              <>
                <MapPin size={14} color={colors.text.secondary} />
                <ThemedText variant="caption" tone="secondary" numberOfLines={1}>
                  {evento.lugar}
                </ThemedText>
              </>
            ) : null}
            <ThemedText variant="caption" tone="secondary">
              {evento.diaCompleto ? 'Todo el día' : FORMATO_HORA.format(fecha)}
            </ThemedText>
          </View>
        </View>
      </ThemedView>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  fecha: {
    backgroundColor: colors.brand.surfaceBlue,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 0,
  },
  dia: { color: colors.brand.primary, lineHeight: undefined },
  mes: { color: colors.brand.primary },
  textos: { flex: 1, gap: spacing.xs },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
