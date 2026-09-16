import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

import { DetalleMateriaActual } from '@/features/academico/components/DetalleMateriaActual';
import { DetalleMateriaHistorica } from '@/features/academico/components/DetalleMateriaHistorica';
import { useMateriaDetalle } from '@/features/academico/hooks/useMateriaDetalle';
import { colors, spacing } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';
import { ApiError } from '@/shared/api/axios';

/**
 * Detalle de materia: el narrowing por `es_actual` delega a la variante
 * correspondiente. Recibe el deep-link del push NOTA_PUBLICADA.
 */
export default function MateriaDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useMateriaDetalle(id);

  return (
    <ThemedView variant="base" style={estilos.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: query.data ? `${query.data.codigo} · ${query.data.nombre}` : 'Materia',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.text.onPrimary,
          headerTitleStyle: { fontWeight: '600' },
        }}
      />

      {query.isPending ? (
        <Centrado>
          <ActivityIndicator color={colors.primary} />
        </Centrado>
      ) : query.isError ? (
        <Centrado gap>
          <ThemedText variant="subtitle" weight="semibold">
            {query.error instanceof ApiError &&
            (query.error.status === 404 || query.error.status === 503)
              ? 'Esta materia ya no está disponible.'
              : 'No se pudo cargar la materia.'}
          </ThemedText>
        </Centrado>
      ) : query.data ? (
        <ScrollView
          contentContainerStyle={estilos.scroll}
          showsVerticalScrollIndicator={false}>
          <ThemedText variant="headline" weight="bold">
            {query.data.nombre}
          </ThemedText>
          <ThemedText variant="caption" tone="secondary">
            {query.data.codigo} · {query.data.creditos} créd.
          </ThemedText>
          {query.data.es_actual ? (
            <DetalleMateriaActual materia={query.data} />
          ) : (
            <DetalleMateriaHistorica materia={query.data} />
          )}
        </ScrollView>
      ) : null}
    </ThemedView>
  );
}

function Centrado({
  children,
  gap = false,
}: {
  children: React.ReactNode;
  gap?: boolean;
}) {
  return (
    <ThemedView variant="base" style={[estilos.centro, gap && estilos.centroConGap]}>
      {children}
    </ThemedView>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.six,
    gap: spacing.two,
  },
  centroConGap: {
    gap: spacing.four,
  },
  scroll: {
    padding: spacing.four,
    gap: spacing.three,
  },
});
