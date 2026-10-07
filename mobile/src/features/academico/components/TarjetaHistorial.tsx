import { Fragment } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { colors, spacing } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';
import type { MateriaHistoricaDTO } from '../types';
import { colorNotaClases } from './MateriaActualCard';

/**
 * Tarjeta agrupada del historial académico: una fila por materia histórica
 * (nombre + código, nota final a la derecha con semáforo) separadas por
 * división sutil. Cumple el deep-link de NOTA_PUBLICADA → detalle materia.
 */
export function TarjetaHistorial({ historicas }: { historicas: MateriaHistoricaDTO[] }) {
  return (
    <ThemedView variant="card" style={estilos.tarjeta}>
      <View style={estilos.fileRule} />
      {historicas.map((materia, indice) => (
        <Fragment key={materia.id}>
          {indice > 0 ? <View style={estilos.divisor} /> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Detalle de ${materia.nombre}`}
            style={estilos.fila}
            onPress={navegar(materia.id)}>
            <View style={estilos.titulos}>
              <ThemedText variant="body" weight="medium" numberOfLines={2}>
                {materia.nombre}
              </ThemedText>
              <ThemedText variant="caption" tone="tertiary">
                {materia.codigo}
              </ThemedText>
            </View>
            <ThemedText
              variant="title"
              weight="bold"
              style={{ color: colorNotaClases(materia.nota_final) }}>
              {materia.nota_final === null ? '—' : Math.round(materia.nota_final).toString()}
            </ThemedText>
          </Pressable>
        </Fragment>
      ))}
    </ThemedView>
  );
}

function navegar(id: string) {
  return () => {
    router.push(`/academico/materias/${id}` as Parameters<typeof router.push>[0]);
  };
}

const estilos = StyleSheet.create({
  tarjeta: {
    paddingVertical: spacing.xs,
    overflow: 'hidden',
  },
  fileRule: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.brand.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  titulos: {
    flex: 1,
    gap: spacing.xs,
  },
  divisor: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
    marginHorizontal: spacing.lg,
  },
});
