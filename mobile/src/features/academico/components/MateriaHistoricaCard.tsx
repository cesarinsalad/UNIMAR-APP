import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { colors, radius, spacing } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';
import { colorNota, etiquetaEstadoHistorica } from '../helpers';
import type { MateriaHistoricaDTO } from '../types';

/** Tarjeta de materia histórica: período + nota final con semáforo + estado. */
export function MateriaHistoricaCard({ materia }: { materia: MateriaHistoricaDTO }) {
  return (
    <Pressable onPress={() => navegar(materia.id)} accessibilityRole="button">
      <ThemedView variant="card" style={estilos.tarjeta}>
        <View style={estilos.cabecera}>
          <ThemedText variant="caption" tone="tertiary">
            {materia.codigo} · {materia.periodo}
          </ThemedText>
          <View style={[estilos.badge, badgePorEstado(materia.estado === 'APROBADA')]}>
            <ThemedText variant="caption" weight="semibold">
              {etiquetaEstadoHistorica(materia.estado)}
            </ThemedText>
          </View>
        </View>
        <View style={estilos.cuerpo}>
          <ThemedText variant="bodyLg" weight="semibold" numberOfLines={2} style={estilos.nombre}>
            {materia.nombre}
          </ThemedText>
          <ThemedText
            variant="title"
            weight="bold"
            style={{ color: colorDeNota(materia.nota_final) }}>
            {materia.nota_final === null ? '—' : materia.nota_final.toFixed(0)}
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

function navegar(id: string) {
  router.push(`/academico/materias/${id}` as Parameters<typeof router.push>[0]);
}

function badgePorEstado(aprobada: boolean): object {
  return aprobada ? estilos.badgeOk : estilos.badgeNo;
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
  },
  badgeOk: {
    backgroundColor: colors.background.sunken,
  },
  badgeNo: {
    backgroundColor: colors.background.elevated,
    borderWidth: 1,
    borderColor: colors.status.danger,
  },
  cuerpo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.two,
  },
  nombre: {
    flex: 1,
  },
});
