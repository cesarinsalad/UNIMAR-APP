import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';
import { colorNota, etiquetaEstadoHistorica } from '../helpers';
import type { MateriaHistoricaDTO } from '../types';

/**
 * Variante histórica (`es_actual: false`): resumen con nota final y estado.
 */
export function DetalleMateriaHistorica({ materia }: { materia: MateriaHistoricaDTO }) {
  return (
    <View style={estilos.bloque}>
      <ThemedView variant="card" style={estilos.tarjeta}>
        <View style={estilos.cabecera}>
          <ThemedText variant="caption" tone="secondary">
            Período {materia.periodo} · {materia.creditos} créd.
          </ThemedText>
          <View style={estilos.badge}>
            <ThemedText variant="caption" weight="semibold">
              {etiquetaEstadoHistorica(materia.estado)}
            </ThemedText>
          </View>
        </View>
        <ThemedText variant="caption" tone="secondary">
          Nota final
        </ThemedText>
        <ThemedText
          variant="headline"
          weight="bold"
          style={{ color: colorDeNota(materia.nota_final) }}>
          {materia.nota_final === null ? '—' : materia.nota_final.toFixed(0)}
        </ThemedText>
      </ThemedView>
    </View>
  );
}

function colorDeNota(nota: number | null): string {
  switch (colorNota(nota)) {
    case 'success':
      return colors.status.success;
    case 'danger':
      return colors.status.danger;
    case 'muted':
      return colors.text.tertiary;
  }
}

const estilos = StyleSheet.create({
  bloque: {
    gap: spacing.three,
  },
  tarjeta: {
    gap: spacing.two,
  },
  cabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: spacing.two,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.background.sunken,
  },
});
