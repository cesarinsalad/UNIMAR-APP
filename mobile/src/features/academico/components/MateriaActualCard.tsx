import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { colors, spacing } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';
import { colorNota } from '../helpers';
import type { MateriaActualDTO } from '../types';

/** Tarjeta de materia en curso: contexto del aula + cortes evaluativos. */
export function MateriaActualCard({ materia }: { materia: MateriaActualDTO }) {
  return (
    <Pressable onPress={() => navegar(materia.id)} accessibilityRole="button">
      <ThemedView variant="card" style={estilos.tarjeta}>
        <ThemedText variant="caption" tone="tertiary">
          {materia.codigo} · {materia.creditos} créd.
        </ThemedText>
        <ThemedText variant="bodyLg" weight="semibold" numberOfLines={2}>
          {materia.nombre}
        </ThemedText>
        <ThemedText variant="caption" tone="secondary">
          {materia.profesor} · {materia.aula} · {materia.horario}
        </ThemedText>
        <View style={estilos.cortes}>
          {materia.cortes.map((corte) => (
            <View key={corte.nombre} style={estilos.corte}>
              <ThemedText variant="caption" numberOfLines={1} style={estilos.nombreCorte}>
                {corte.nombre} ({corte.ponderacion}%)
              </ThemedText>
              <ThemedText
                variant="caption"
                weight="semibold"
                style={{ color: colorDeCorte(corte.nota) }}>
                {corte.nota === null ? '—' : corte.nota.toFixed(0)}
              </ThemedText>
            </View>
          ))}
        </View>
      </ThemedView>
    </Pressable>
  );
}

function navegar(id: string) {
  router.push(`/academico/materias/${id}` as Parameters<typeof router.push>[0]);
}

function colorDeCorte(nota: number | null): string {
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
  tarjeta: {
    gap: spacing.one,
  },
  cortes: {
    gap: spacing.one,
    marginTop: spacing.one,
  },
  corte: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nombreCorte: {
    flex: 1,
  },
});
