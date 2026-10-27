import { useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, spacing } from '@/shared/ui';
import {
  EmptyState,
  HeaderTab,
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

/**
 * Tab Clases (mock aprobado): header con campana, materias en curso como
 * filas de registro (nombre, profesor, horario) + historial académico
 * filtrable por período. El filtrado es local (helpers puros): una sola
 * query, sin refetch.
 */
export default function AcademicoScreen() {
  const insets = useSafeAreaInsets();
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
    <ThemedView variant="base" style={estilos.pantalla}>
      <ScrollView
        contentContainerStyle={[
          estilos.scroll,
          {
            paddingTop: spacing.lg,
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
        <HeaderTab
          titulo="Clases"
        />

        {particion.actuales.length > 0 ? (
          <>
            <ThemedText variant="caption" weight="semibold" style={estilos.etiquetaGrupo}>
              MATERIAS EN CURSO
            </ThemedText>
            <View style={estilos.tarjetasActuales}>
              {particion.actuales.map((materia) => (
                <MateriaActualCard key={materia.id} materia={materia} />
              ))}
            </View>
          </>
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
    </ThemedView>
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
  pantalla: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  scroll: {
    padding: spacing.lg,
  },
  tarjetasMaterias: {
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  // Sobretítulo del grupo vivo: la receta eyebrow de la casa
  // (EtiquetaCategoria.mayusculas — caption + MAYÚSCULAS + tracking 0.8),
  // en gris metadato; corona el grupo con 24px de aire según la regla de
  // proximidad — más espacio sobre la etiqueta que entre cards (12).
  etiquetaGrupo: {
    marginTop: spacing.xl,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.text.secondary,
  },
  tarjetasActuales: {
    gap: spacing.md,
    marginTop: spacing.sm,
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
