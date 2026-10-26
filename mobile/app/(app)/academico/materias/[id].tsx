import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ArrowLeftIcon } from 'phosphor-react-native';

import { DetalleMateriaActual } from '@/features/academico/components/DetalleMateriaActual';
import { DetalleMateriaHistorica } from '@/features/academico/components/DetalleMateriaHistorica';
import { tonalidadesCodigo } from '@/features/academico/components/MateriaActualCard';
import { formatearPeriodo } from '@/features/academico/helpers';
import { useMateriaDetalle } from '@/features/academico/hooks/useMateriaDetalle';
import type { MateriaDTO } from '@/features/academico/types';
import { colors, radius, spacing } from '@/shared/ui';
import { BotonCircular, ThemedText, ThemedView } from '@/shared/ui';
import { ApiError } from '@/shared/api/axios';

/**
 * Detalle de materia (patrón lector): back circular flotante sobre el
 * contenido; cabecera con badge de código tintado, nombre headline y meta
 * caption. El narrowing por `es_actual` delega a la variante que muestra
 * el documento con su semáforo de notas. Recibe el deep-link del push
 * NOTA_PUBLICADA.
 */
export default function MateriaDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useMateriaDetalle(id);

  return (
    <ThemedView variant="base" style={estilos.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={estilos.filaBotones}>
        <BotonCircular label="Volver" onPress={() => router.back()}>
          <ArrowLeftIcon size={20} color={colors.brand.primary} weight="bold" />
        </BotonCircular>
      </View>

      {query.isPending ? (
        <Centrado>
          <ActivityIndicator color={colors.brand.primary} />
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

/** Cabecera en contenido: badge de código (tono determinístico) + nombre + meta. */
function CabeceraMateria({ data }: { data: MateriaDTO }) {
  const tonos = tonalidadesCodigo(data.codigo);
  const meta = data.es_actual
    ? `${data.creditos} créd.${
        data.seccion ? ` · Sección ${data.seccion}` : ''
      }`
    : `${formatearPeriodo(data.periodo)} · ${data.creditos} créd.`;

  return (
    <View style={estilos.cabecera}>
      <View style={[estilos.badgeCodigo, { backgroundColor: tonos.fondo }]}>
        <ThemedText
          variant="caption"
          weight="semibold"
          style={{ color: tonos.texto }}>
          {data.codigo}
        </ThemedText>
      </View>
      <ThemedText variant="headline" weight="bold" numberOfLines={2}>
        {data.nombre}
      </ThemedText>
      <ThemedText variant="caption" tone="secondary">
        {meta}
      </ThemedText>
    </View>
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
    backgroundColor: colors.bg.canvas,
  },
  filaBotones: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    top: spacing.md,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.twelve,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  cabecera: {
    gap: spacing.sm,
  },
  badgeCodigo: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  centroConGap: {
    gap: spacing.lg,
  },
});
