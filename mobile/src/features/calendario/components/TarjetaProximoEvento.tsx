import { Pressable, StyleSheet, View } from 'react-native';
import { MapPinIcon, ClockIcon } from 'phosphor-react-native';
import { router } from 'expo-router';

import { colors, spacing, radius } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';

export interface EventoResumen {
  id: string;
  titulo: string;
  tipo: 'OFICIAL' | 'PERSONAL';
  inicioAt: string;
  finAt?: string | null;
  diaCompleto: boolean;
  lugar: string | null;
}

/** Barra lateral de la tarjeta: azul corporativo (OFICIAL) o gris (PERSONAL). */
export function colorBarra(tipo: 'OFICIAL' | 'PERSONAL'): string {
  return tipo === 'OFICIAL' ? colors.brand.primary : colors.border.strong;
}

const FORMATO_MES_CORTO = new Intl.DateTimeFormat('es-VE', { month: 'short' });

/**
 * Tarjeta de "Próximos eventos" estilo mock: bloque de fecha (día grande +
 * mes corto), barra lateral de color por tipo y fila hora/lugar.
 */
export function TarjetaProximoEvento({ evento }: { evento: EventoResumen }) {
  const inicio = new Date(evento.inicioAt);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Detalle de ${evento.titulo}`}
      onPress={() => router.push(`/eventos/${evento.id}` as never)}>
      <ThemedView variant="card" style={estilos.tarjeta}>
        <View style={estilos.fecha}>
          <ThemedText variant="title" weight="bold">
            {inicio.getDate().toString().padStart(2, '0')}
          </ThemedText>
          <ThemedText variant="caption" tone="secondary">
            {FORMATO_MES_CORTO.format(inicio).replace('.', '')}
          </ThemedText>
        </View>
        <View style={[estilos.barra, { backgroundColor: colorBarra(evento.tipo) }]} />
        <View style={estilos.cuerpo}>
          <ThemedText variant="body" weight="medium" numberOfLines={1}>
            {evento.titulo}
          </ThemedText>
          <View style={estilos.meta}>
            <FilaMeta texto={evento.diaCompleto ? 'Todo el día' : horaRango(evento)} icono={<ClockIcon size={14} color={colors.text.secondary} />} />
            {evento.lugar ? (
              <FilaMeta texto={evento.lugar} icono={<MapPinIcon size={14} color={colors.text.secondary} />} />
            ) : null}
          </View>
        </View>
      </ThemedView>
    </Pressable>
  );
}

function FilaMeta({ texto, icono }: { texto: string; icono: React.ReactNode }) {
  return (
    <View style={estilos.filaMeta}>
      {icono}
      <ThemedText variant="caption" tone="secondary" numberOfLines={1}>
        {texto}
      </ThemedText>
    </View>
  );
}

const FORMATO_HORA = new Intl.DateTimeFormat('es-VE', { timeStyle: 'short' });

function horaRango(evento: EventoResumen): string {
  if (evento.diaCompleto) return 'Todo el día';
  const inicio = new Date(evento.inicioAt);
  if (!evento.finAt) return FORMATO_HORA.format(inicio);
  return `${FORMATO_HORA.format(inicio)} - ${FORMATO_HORA.format(new Date(evento.finAt))}`;
}

const estilos = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingRight: spacing.lg,
  },
  fecha: {
    alignItems: 'center',
    gap: 2,
  },
  barra: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: radius.pill,
  },
  cuerpo: {
    flex: 1,
    gap: spacing.xs,
  },
  meta: {
    gap: 2,
  },
  filaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
