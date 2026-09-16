import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

import {
  agruparPorTrimestre,
  marcarAprobadas,
  particionarMaterias,
} from '@/features/academico/helpers';
import { PensumSection } from '@/features/academico/components/PensumSection';
import { useMaterias } from '@/features/academico/hooks/useMaterias';
import { usePensum } from '@/features/academico/hooks/usePensum';
import { usePerfil } from '@/features/academico/hooks/usePerfil';
import { colors, spacing } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';

/**
 * Plan de estudios de la carrera del estudiante (`perfil.carrera` como
 * carrera_id — decisión 5c, válida con el mock; revisar con la API real).
 * El badge "Aprobada" se resuelve en memoria contra las históricas ya
 * descargadas (misma key de materias → cero llamadas extra).
 */
export default function PensumScreen() {
  const perfil = usePerfil();
  const materias = useMaterias();
  const carreraId = perfil.data?.carrera ?? null;
  const pensum = usePensum(carreraId);

  const grupos = useMemo(() => {
    if (!pensum.data) return [];
    const { historicas } = particionarMaterias(materias.data ?? []);
    return agruparPorTrimestre(marcarAprobadas(pensum.data.materias, historicas));
  }, [pensum.data, materias.data]);

  return (
    <ThemedView variant="base" style={estilos.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: pensum.data ? `Plan · ${pensum.data.carrera}` : 'Plan de estudios',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.text.onPrimary,
          headerTitleStyle: { fontWeight: '600' },
        }}
      />

      {pensum.isPending || perfil.isPending ? (
        <Centrado>
          <ActivityIndicator color={colors.primary} />
        </Centrado>
      ) : pensum.isError || perfil.isError || !pensum.data ? (
        <Centrado gap>
          <ThemedText variant="subtitle" weight="semibold">
            No se pudo cargar el plan de estudios.
          </ThemedText>
        </Centrado>
      ) : (
        <ScrollView
          contentContainerStyle={estilos.scroll}
          showsVerticalScrollIndicator={false}>
          <PensumSection grupos={grupos} />
        </ScrollView>
      )}
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
