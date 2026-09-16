import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';
import { colorNota } from '../helpers';
import type { PerfilAcademico } from '../types';

const TONO_NOTA = {
  success: colors.status.success,
  danger: colors.status.danger,
  muted: colors.text.tertiary,
} as const;

/**
 * Cabecera del tab: identidad académica del estudiante según UNIMAR.
 * El promedio usa el semáforo de la escala 0–20 (aprobado ≥ 10).
 */
export function PerfilHeader({ perfil }: { perfil: PerfilAcademico }) {
  return (
    <ThemedView variant="card" style={estilos.tarjeta}>
      <ThemedText variant="subtitle" weight="semibold">
        {perfil.carrera}
      </ThemedText>
      <ThemedText variant="caption" tone="secondary">
        {perfil.nombre} · C.I. {perfil.cedula}
      </ThemedText>
      <View style={estilos.fila}>
        <Dato etiqueta="Semestre" valor={`${perfil.semestre}°`} />
        <Dato etiqueta="Estatus" valor={perfil.estatus} />
        <View style={estilos.promedio}>
          <ThemedText variant="caption" tone="secondary">
            Promedio
          </ThemedText>
          <ThemedText
            variant="title"
            weight="bold"
            style={{ color: TONO_NOTA[colorNota(perfil.promedio)] }}>
            {perfil.promedio === null ? '—' : perfil.promedio.toFixed(1)}
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View>
      <ThemedText variant="caption" tone="secondary">
        {etiqueta}
      </ThemedText>
      <ThemedText variant="bodyLg" weight="semibold">
        {valor}
      </ThemedText>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    gap: spacing.two,
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.two,
  },
  promedio: {
    alignItems: 'flex-end',
  },
});
