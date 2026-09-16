import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

import { HistorialMedicoSection } from '@/features/academico/components/HistorialMedicoSection';
import { useHistorialMedico } from '@/features/academico/hooks/useHistorialMedico';
import { colors, spacing } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';
import { ApiError } from '@/shared/api/axios';

/**
 * Historial médico del estudiante: lectura restringida server-side.
 * 403 → mensaje de acceso denegado (sin reintento ciego: reintentar no
 * cambia el permiso).
 */
export default function HistorialMedicoScreen() {
  const query = useHistorialMedico();

  return (
    <ThemedView variant="base" style={estilos.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Historial médico',
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
            {query.error instanceof ApiError && query.error.status === 403
              ? 'Disponible solo para el propio estudiante.'
              : 'No se pudo cargar el historial médico.'}
          </ThemedText>
        </Centrado>
      ) : query.data ? (
        <ScrollView
          contentContainerStyle={estilos.scroll}
          showsVerticalScrollIndicator={false}>
          <HistorialMedicoSection historial={query.data} />
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
