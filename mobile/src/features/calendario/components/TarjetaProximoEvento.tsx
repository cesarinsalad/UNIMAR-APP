import { StyleSheet, View } from 'react-native';
import { MapPinIcon, ClockIcon } from 'phosphor-react-native';
import { router } from 'expo-router';

import { colors, elevation, highlight, spacing, radius } from '@/shared/ui';
import { PressableScale, ThemedText, ThemedView } from '@/shared/ui';

export interface EventoResumen {
  id: string;
  titulo: string;
  tipo: 'OFICIAL' | 'PERSONAL' | 'INSTITUCIONAL';
  inicioAt: string;
  finAt?: string | null;
  diaCompleto: boolean;
  lugar: string | null;
  decanatoIds?: number[];
  /** compacto: filas de una sola línea (listas del día), sin caption tipo. */
  compacta?: boolean;
  /** True si el usuario lo tiene en su agenda (pivot participar). */
  participo?: boolean;
}

/** Barra lateral de la tarjeta: azul corporativo (OFICIAL), pálido
 *  (INSTITUCIONAL) o gris (PERSONAL). */
export function colorBarra(tipo: 'OFICIAL' | 'PERSONAL' | 'INSTITUCIONAL'): string {
  if (tipo === 'OFICIAL') return colors.brand.primary;
  if (tipo === 'INSTITUCIONAL') return colors.brand.surfaceBlue;
  return colors.border.strong;
}

const FORMATO_MES_CORTO = new Intl.DateTimeFormat('es-VE', { month: 'short' });

/**
 * LA receta de evento del sistema (motivo "bloque de fecha"): día grande +
 * mes en tinta azul, barra lateral de color por tipo, hora y lugar. Única
 * forma para la entidad — la repetición entre Inicio/Noticias/Agenda es la
 * firma. `compacta` la reduce a una fila para listas densas.
 * `presionable=false` reutiliza la MISMA receta cuando el card es la
 * cabecera del propio detalle (sin PressableScale ni navegación recursiva).
 */
export function TarjetaProximoEvento({
  evento,
  presionable = true,
}: {
  evento: EventoResumen;
  presionable?: boolean;
}) {
  const inicio = new Date(evento.inicioAt);
  const tarjeta = (
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
        <ThemedText variant="bodySm" weight="medium" numberOfLines={1}>
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
  );
  if (!presionable) return tarjeta;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Detalle de ${evento.titulo}`}
      onPress={() => router.push(`/eventos/${evento.id}` as never)}>
      {tarjeta}
    </PressableScale>
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

/** Rango corto de horas del card: "Todo el día", "HH:mm" o "HH:mm - HH:mm".
 *  Exportado: el header del detalle-documento lo reutiliza para no duplicar
 *  el formato. */
export function horaRango(evento: EventoResumen): string {
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
    // Sombra pequeña (receta oficial del Card shared) para que la tarjeta
    // destaque sobre el canvas sin hablar más fuerte que la destacada.
    ...elevation.sm,
    // Resplandor superior institucional (mismo patrón que Card).
    ...highlight.sm,
  },
  fecha: {
    alignItems: 'center',
    gap: 0,
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
