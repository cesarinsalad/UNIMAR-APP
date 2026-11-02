import { StyleSheet, View } from 'react-native';
import { MapPinIcon, ClockIcon } from 'phosphor-react-native';
import { router } from 'expo-router';

import {
  PALETA_CALENDARIO_UNIMAR,
  colors,
  elevation,
  highlight,
  spacing,
  radius,
} from '@/shared/ui';
import { clasificarEventoVisual } from '../colores-evento';
import { PressableScale, ThemedText, ThemedView } from '@/shared/ui';

export interface EventoResumen {
  id: string;
  titulo: string;
  tipo: 'OFICIAL' | 'PERSONAL' | 'INSTITUCIONAL' | 'FERIADO';
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

/** Barra lateral de la tarjeta: el color fuerte de la paleta UNIMAR según
 *  la naturaleza visual del evento (institucional azul, campus verde,
 *  decanato dorado, feriado terracota, personal violeta). */
export function colorBarra(evento: Pick<EventoResumen, 'tipo' | 'decanatoIds'>): string {
  const visual = clasificarEventoVisual({ ...evento, decanatoIds: evento.decanatoIds ?? [] });
  return PALETA_CALENDARIO_UNIMAR[visual].color;
}

const FORMATO_MES_CORTO = new Intl.DateTimeFormat('es-VE', { month: 'short' });

/**
 * LA receta de evento del sistema (motivo "bloque de fecha"): día grande +
 * mes en tinta azul, barra lateral de color por tipo, hora y lugar. Única
 * forma para la entidad — la repetición entre Inicio/Noticias/Agenda es la
 * firma. `compacta` la usa la lista del día seleccionado en Agenda: el
 * encabezado de la sección ya nombra el día, así que el bloque "19 · SEP"
 * se vuelve columna dura de hora (receta AgendaDia: inicio semibold +
 * fin caption) y la meta conserva solo el lugar.
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
      <View style={[estilos.fecha, evento.compacta && estilos.fechaCompacta]}>
        {evento.compacta ? (
          <>
            <ThemedText variant="bodySm" weight="semibold" numberOfLines={2}>
              {evento.diaCompleto ? 'Todo el día' : hhmm(inicio)}
            </ThemedText>
            {!evento.diaCompleto && evento.finAt ? (
              <ThemedText variant="caption" tone="secondary">
                {hhmm(new Date(evento.finAt))}
              </ThemedText>
            ) : null}
          </>
        ) : (
          <>
            <ThemedText variant="title" weight="bold">
              {inicio.getDate().toString().padStart(2, '0')}
            </ThemedText>
            <ThemedText variant="caption" tone="secondary">
              {FORMATO_MES_CORTO.format(inicio).replace('.', '')}
            </ThemedText>
          </>
        )}
      </View>
      <View style={[estilos.barra, { backgroundColor: colorBarra(evento) }]} />
      <View style={estilos.cuerpo}>
        <ThemedText variant="bodySm" weight="medium" numberOfLines={1}>
          {evento.titulo}
        </ThemedText>
        {(!evento.compacta || evento.lugar) ? (
          <View style={estilos.meta}>
            {!evento.compacta ? (
              <FilaMeta
                texto={evento.diaCompleto ? 'Todo el día' : horaRango(evento)}
                icono={<ClockIcon size={14} color={colors.text.secondary} />}
              />
            ) : null}
            {evento.lugar ? (
              <FilaMeta
                texto={evento.lugar}
                icono={<MapPinIcon size={14} color={colors.text.secondary} />}
              />
            ) : null}
          </View>
        ) : null}
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

/** "HH:mm" 24h para la columna dura de la lista del día (receta AgendaDia). */
function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

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
    // paddingLeft simétrico al paddingRight: la fecha no pega contra la
    // esquina redondeada.
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...elevation.sm,
    ...highlight.sm,
  },
  /** Ancho fijo de columna de fecha: "05"/"17" y el mes alinean entre
   *  tarjetas para que la barra no salte de posición. */
  fecha: {
    alignItems: 'center',
    gap: 0,
    minWidth: 44,
  },
  /** Modo compacta: columna dura de hora (52 = receta AgendaDia) alineada
   *  a la izquierda; el día lo dice el encabezado de la sección. Ancho FIJO
   *  (no minWidth): sin tope, "Todo el día" se mediría en su ancho natural
   *  de una sola línea, agrandaría la columna y empujaría el título. Con el
   *  ancho fijo ese label ya hace wrap a 2 líneas (numberOfLines=2) y la
   *  barra queda alineada entre cards de hora y de día completo. */
  fechaCompacta: {
    width: 52,
    alignItems: 'flex-start',
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
