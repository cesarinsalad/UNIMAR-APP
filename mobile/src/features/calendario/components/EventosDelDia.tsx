import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { etiquetaAudiencia } from '@/shared/lib/etiquetas';
import { colors, spacing } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';
import type { Evento } from '../types';

const FORMATO_HORA = new Intl.DateTimeFormat('es-VE', { timeStyle: 'short' });

interface Props {
  /** Eventos del día seleccionado ya agrupados por el cálculo puro. */
  eventos: Array<{
    id: string;
    titulo: string;
    tipo: Evento['tipo'];
    inicioAt: string;
    diaCompleto: boolean;
    decanatoIds: number[];
  }>;
}

/** Cards del día seleccionado: barra azul (OFICIAL) o gris (PERSONAL). */
export function EventosDelDia({ eventos }: { eventos: Props['eventos'] }) {
  if (eventos.length === 0) {
    return (
      <ThemedText variant="caption" tone="tertiary">
        Sin eventos este día.
      </ThemedText>
    );
  }

  return (
    <View style={estilos.lista}>
      {eventos.map((evento) => (
        <Pressable
          key={evento.id}
          onPress={() => router.push(`/eventos/${evento.id}` as never)}>
          <ThemedView variant="card" style={estilos.card}>
            <View style={[estilos.barra, evento.tipo === 'OFICIAL' ? estilos.barraOficial : null]} />
            <View style={estilos.textos}>
              <ThemedText variant="caption" tone="tertiary">
                {tituloTipo(evento.tipo)} · {etiquetaAudiencia(evento.decanatoIds)}
              </ThemedText>
              <ThemedText variant="body" weight="semibold" numberOfLines={2}>
                {evento.titulo}
              </ThemedText>
              <ThemedText variant="caption" tone="secondary">
                {evento.diaCompleto
                  ? 'Todo el día'
                  : FORMATO_HORA.format(new Date(evento.inicioAt))}
              </ThemedText>
            </View>
          </ThemedView>
        </Pressable>
      ))}
    </View>
  );
}

function tituloTipo(tipo: Evento['tipo']): string {
  return tipo === 'OFICIAL' ? 'Evento oficial' : 'Personal';
}

const estilos = StyleSheet.create({
  lista: {
    gap: spacing.three,
  },
  card: {
    flexDirection: 'row',
    paddingLeft: 0,
    overflow: 'hidden',
  },
  barra: {
    width: 4,
    height: '100%',
    backgroundColor: colors.grayLight,
    borderRadius: 2,
  },
  barraOficial: {
    backgroundColor: colors.primary,
  },
  textos: {
    flex: 1,
    gap: spacing.one / 2,
  },
});