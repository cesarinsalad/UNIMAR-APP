import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { ArrowLeftIcon } from 'phosphor-react-native';

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
import { BotonCircular, EstadoCentrado, ThemedText, ThemedView } from '@/shared/ui';

/**
 * Plan de estudios de la carrera del estudiante (`perfil.carrera` como
 * carrera_id — decisión 5c, válida con el mock; revisar con la API real).
 * El badge "Aprobada" se resuelve en memoria contra las históricas ya
 * descargadas (misma key de materias → cero llamadas extra). Convención de
 * detalle de la casa: back circular flotante y título EN CONTENIDO (carrera
 * como metadato en gris); la barra nativa azul centrada violaba la firma.
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
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[estilos.filaBotones, { top: spacing.md }]}>
        <BotonCircular label="Volver" onPress={volver}>
          <ArrowLeftIcon size={20} color={colors.brand.primary} weight="bold" />
        </BotonCircular>
      </View>

      {pensum.isPending || perfil.isPending ? (
        <EstadoCentrado>
          <ActivityIndicator color={colors.brand.primary} />
        </EstadoCentrado>
      ) : pensum.isError || perfil.isError || !pensum.data ? (
        <EstadoCentrado gap>
          <ThemedText variant="subtitle" weight="semibold">
            No se pudo cargar el plan de estudios.
          </ThemedText>
        </EstadoCentrado>
      ) : (
        <ScrollView
          contentContainerStyle={[
            estilos.scroll,
            { paddingTop: spacing.md + 40 + spacing.sm },
          ]}
          showsVerticalScrollIndicator={false}>
          <View style={estilos.cabecera}>
            <ThemedText variant="headline" weight="bold">
              Plan de estudios
            </ThemedText>
            <ThemedText variant="body" tone="secondary">
              {pensum.data.carrera}
            </ThemedText>
          </View>
          <PensumSection grupos={grupos} />
        </ScrollView>
      )}
    </ThemedView>
  );
}

/** El back circular blindado de la casa: fallback al Perfil (tab de origen). */
function volver() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/perfil');
  }
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  filaBotones: {
    position: 'absolute',
    left: spacing.lg,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cabecera: {
    gap: spacing.sm,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
});
