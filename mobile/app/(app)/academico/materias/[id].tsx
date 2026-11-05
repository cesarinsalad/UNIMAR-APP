import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeftIcon } from 'phosphor-react-native';

import { DetalleMateriaActual } from '@/features/academico/components/DetalleMateriaActual';
import { DetalleMateriaHistorica } from '@/features/academico/components/DetalleMateriaHistorica';
import { useMateriaDetalle } from '@/features/academico/hooks/useMateriaDetalle';
import type { MateriaDTO } from '@/features/academico/types';
import { colors, spacing } from '@/shared/ui';
import { BotonCircular, EstadoCentrado, ThemedButton, ThemedText, ThemedView } from '@/shared/ui';
import { ApiError } from '@/shared/api/axios';

/**
 * Detalle de materia (patrón lector): back circular flotante bajo el safe
 * area del teléfono (`insets.top`, la convención del detalle de evento),
 * con fallback a la tab Clases si el push llegó a una app en frío (sin
 * stack). La cabecera es solo el nombre headline — el metadato vive en el
 * cuadro de información. El narrowing por `es_actual` delega a la
 * variante que muestra el acta como libro de registro. Recibe el
 * deep-link del push NOTA_PUBLICADA; el error ofrece salida (Reintentar)
 * y el contenido soporta pull-to-refresh.
 */
export default function MateriaDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useMateriaDetalle(id);
  const insets = useSafeAreaInsets();

  return (
    <ThemedView variant="base" style={estilos.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={estilos.filaBotones}>
        <BotonCircular label="Volver" onPress={volver}>
          <ArrowLeftIcon size={20} color={colors.brand.primary} weight="bold" />
        </BotonCircular>
      </View>

      {query.isPending ? (
        <EstadoCentrado a11yLabel="Cargando la materia">
          <ActivityIndicator color={colors.brand.primary} />
        </EstadoCentrado>
      ) : query.isError ? (
        <EstadoCentrado gap>
          <ThemedText variant="subtitle" weight="semibold">
            {mensajeError(query.error)}
          </ThemedText>
          <ThemedButton
            title="Reintentar"
            variant="secondary"
            onPress={() => void query.refetch()}
          />
        </EstadoCentrado>
      ) : query.data ? (
        <ScrollView
          contentContainerStyle={[
            estilos.scroll,
            {
              // Compacto: el back (40) vive bajo la BarraInstitucional (el
              // inset superior es de la barra; aquí no se vuelve a sumar) y
              // el título arranca a aire fijo — el detalle debe caber sin
              // scroll en la mayoría de pantallas.
              paddingTop: spacing.md + 40 + spacing.sm,
              paddingBottom: insets.bottom + spacing.lg,
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              accessibilityLabel="Actualizando la materia"
              refreshing={query.isRefetching}
              onRefresh={() => {
                void query.refetch();
              }}
              colors={[colors.brand.primary]}
              tintColor={colors.brand.primary}
            />
          }>
          <CabeceraMateria data={query.data} />
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

/**
 * El back circular del detalle de evento, blindado: en un deep-link de
 * arranque en frío (push NOTA_PUBLICADA con la app cerrada) no hay stack
 * del que volver — se aterriza en la tab Clases en vez de quedar atrapado.
 */
function volver() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/academico');
  }
}

/** Copia de error por estado: 404 y 503 no dicen lo mismo. */
function mensajeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return 'Esta materia ya no está disponible.';
    if (error.status === 503)
      return 'El servicio no está disponible ahora. Intenta de nuevo.';
  }
  return 'No se pudo cargar la materia.';
}

/** Cabecera en contenido: solo el nombre — el metadato vive en el cuadro de información. */
function CabeceraMateria({ data }: { data: MateriaDTO }) {
  return (
    <View style={estilos.cabecera}>
      <ThemedText variant="headline" weight="bold" numberOfLines={2}>
        {data.nombre}
      </ThemedText>
    </View>
  );
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
  scroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  cabecera: {
    gap: spacing.sm,
  },
});
