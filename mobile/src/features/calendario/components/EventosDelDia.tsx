import { StyleSheet, View } from 'react-native';

import { spacing } from '@/shared/ui';
import { ThemedText } from '@/shared/ui';
import { TarjetaProximoEvento, type EventoResumen } from './TarjetaProximoEvento';
import type { Evento } from '../types';

/**
 * Cards del día seleccionado en Agenda — misma receta de evento
 * (TarjetaProximoEvento, modo compacto) que el resto del sistema; la
 * barra lateral azul/gris es el único diferencial de tipo. Nada de
 * tokens legacy ni tercera forma de dibujar un evento.
 */
export function EventosDelDia({ eventos }: { eventos: Array<{
  id: string;
  titulo: string;
  tipo: Evento['tipo'];
  inicioAt: string;
  finAt?: string | null | undefined;
  diaCompleto: boolean;
  lugar: string | null;
  decanatoIds: number[];
}> }) {
  if (eventos.length === 0) {
    return (
      <ThemedText variant="caption" tone="tertiary">
        Sin eventos este día.
      </ThemedText>
    );
  }

  return (
    <View style={estilos.lista}>
      {eventos.map((evento) => {
        const resumen: EventoResumen = {
          ...evento,
          compacta: true,
        };
        return <TarjetaProximoEvento key={evento.id} evento={resumen} />;
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  lista: {
    gap: spacing.md,
  },
});
