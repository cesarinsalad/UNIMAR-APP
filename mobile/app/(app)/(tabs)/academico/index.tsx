import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, spacing } from '@/shared/ui';
import {
  EmptyState,
  SectionHeader,
  ThemedText,
  ThemedView,
} from '@/shared/ui';
import {
  filtrarPorPeriodo,
  particionarMaterias,
  periodosDisponibles,
} from '@/features/academico/helpers';
import { useMaterias } from '@/features/academico/hooks/useMaterias';
import { MateriaActualCard } from '@/features/academico/components/MateriaActualCard';
import { SelectorPeriodo } from '@/features/academico/components/SelectorPeriodo';
import { TarjetaHistorial } from '@/features/academico/components/TarjetaHistorial';
import { CampanaConBadge } from '@/features/notificaciones/components/CampanaConBadge';
import { useNoLeidas } from '@/features/notificaciones/hooks/useNoLeidas';

/**
 * Tab Clases: materias en curso con cortes evaluativos + historial
 * académico filtrable por período. El filtrado es local (helpers puros):
 * una sola query, sin refetch al cambiar de período.
 */
export default function AcademicoScreen() {
  const insets = useSafeAreaInsets();
  const noLeidas = useNoLeidas();
  const materias = useMaterias();
  const [periodoActivo, setPeriodoActivo] = useState<string | null>(null);

  const particion = useMemo(
    () => particionarMaterias(materias.data ?? []),
    [materias.data],
  );
  const periodos = useMemo(
    () => periodosDisponibles(particion.historicas),
    [particion.historicas],
  );
  const historicasVisibles = useMemo(
    () => filtrarPorPeriodo(particion.historicas, periodoActivo),
    [periodoActivo, particion],
  );

  if (materias.isPending) {
    return (
      <EstadoCentrado>
        <ActivityIndicator color={colors.brand.primary} />
        <ThemedText tone="secondary">Cargando clases...</ThemedText>
      </EstadoCentrado>
    );
  }

  if (materias.isError) {
    return (
      <EstadoCentrado gap>
        <ThemedText tone="secondary">
          No se pudieron cargar tus clases.
        </ThemedText>
        <ThemedText
          variant="body"
          weight="semibold"
          style={estilos.reintentar}
          onPress={() => void materias.refetch()}>
          Reintentar
        </ThemedText>
      </EstadoCentrado>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        estilos.scroll,
        {
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + layout.bottomTabInset,
        },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={materias.isRefetching}
          onRefresh={() => {
            void materias.refetch();
          }}
          colors={[colors.brand.primary]}
          tintColor={colors.brand.primary}
        />
      }>
      <View style={estilos.cabecera}>
        <ThemedText variant="headline" weight="semibold">
          Clases
        </ThemedText>
        <CampanaConBadge total={noLeidas.data?.total ?? 0} tono="claro" />
      </View>

      <SectionHeader title="Materias en curso" />
      {particion.actuales.length > 0 ? (
        <View style={estilos.tarjetasMaterias}>
          {particion.actuales.map((materia) => (
            <MateriaActualCard key={materia.id} materia={materia} />
          ))}
        </View>
      ) : (
        <EmptyState
          title="Sin materias en curso"
          message="Cuando UNIMAR publique tu carga actual, aparecerá aquí."
        />
      )}

      <SectionHeader title="Historial académico" style={estilos.seccionHistorial} />
      {particion.historicas.length > 0 ? (
        <View style={estilos.tarjetasMaterias}>
          <SelectorPeriodo
            periodos={periodos}
            activo={periodoActivo}
            onSeleccionar={setPeriodoActivo}
          />
          {historicasVisibles.length > 0 ? (
            <TarjetaHistorial historicas={historicasVisibles} />
          ) : (
            <EmptyState
              title="Sin historial en este período"
              message="Prueba con otro período académico."
            />
          )}
        </View>
      ) : (
        <EmptyState
          title="Sin historial académico"
          message="Tus materias aprobadas y reprobadas aparecerán aquí."
        />
      )}
    </ScrollView>
  );
}

function EstadoCentrado({
  children,
  gap = false,
}: {
  children: React.ReactNode;
  gap?: boolean;
}) {
  return (
    <ThemedView variant="base" style={[estilos.estado, gap && estilos.estadoConGap]}>
      {children}
    </ThemedView>
  );
}

const estilos = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  tarjetasMaterias: {
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  seccionHistorial: {
    marginTop: spacing.xl,
  },
  estado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.bg.canvas,
  },
  estadoConGap: {
    gap: spacing.lg,
  },
  reintentar: {
    color: colors.brand.primary,
    textDecorationLine: 'underline',
  },
});
