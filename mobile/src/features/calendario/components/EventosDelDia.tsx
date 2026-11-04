import { StyleSheet, View } from 'react-native';

import { spacing } from '@/shared/ui';
import { ThemedText } from '@/shared/ui';
import { TarjetaProximoEvento, type EventoResumen } from './TarjetaProximoEvento';
import type { Evento } from '../types';

/**
 * Lista del día seleccionado en Agenda — la misma receta de evento
 * (TarjetaProximoEvento, modo compacto) con la columna dura de hora en vez
 * del bloque de fecha: el día lo nombra el encabezado de identidad de la
 * sección (badge azul + día de semana en mayúsculas, espejo del header de
 * mes), y la barra lateral de color por naturaleza (paleta UNIMAR) sigue
 * siendo el único diferencial de tipo. Nada de tokens legacy ni tercera
 * forma de dibujar un evento.
 */
export function EventosDelDia({ eventos, onPresionar }: {
  eventos: Array<{
    id: string;
    titulo: string;
    tipo: Evento['tipo'];
    inicioAt: string;
    finAt?: string | null | undefined;
    diaCompleto: boolean;
    lugar: string | null;
    decanatoIds: number[];
  }>;
  /** Override del tap de cada tarjeta (default del call-site: hoja). */
  onPresionar?: (evento: EventoResumen) => void;
}) {
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
        return (
          <TarjetaProximoEvento
            key={evento.id}
            evento={resumen}
            onPresionar={onPresionar}
          />
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  lista: {
    gap: spacing.md,
  },
});
