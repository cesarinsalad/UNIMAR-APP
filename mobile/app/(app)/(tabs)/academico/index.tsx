import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { colors, radius, spacing } from '@/shared/ui';
import { ThemedButton, ThemedText, ThemedView } from '@/shared/ui';
import {
  filtrarPorPeriodo,
  particionarMaterias,
  periodosDisponibles,
} from '@/features/academico/helpers';
import type { MateriaDTO } from '@/features/academico/types';
import { useMaterias } from '@/features/academico/hooks/useMaterias';
import { usePerfil } from '@/features/academico/hooks/usePerfil';
import { MateriaActualCard } from '@/features/academico/components/MateriaActualCard';
import { MateriaHistoricaCard } from '@/features/academico/components/MateriaHistoricaCard';
import { PerfilHeader } from '@/features/academico/components/PerfilHeader';

type Vista = 'curso' | 'historial';

/**
 * Tab académico: perfil arriba, vista En curso / Historial con chips y,
 * dentro del historial, selector de período institucional. El filtrado es
 * local (helpers puros): una sola query, sin refetch al cambiar de vista.
 */
export default function AcademicoScreen() {
  const perfil = usePerfil();
  const materias = useMaterias();
  const insets = useSafeAreaInsets();
  const [vista, setVista] = useState<Vista>('curso');
  const [periodo, setPeriodo] = useState<string | null>(null);

  const particion = useMemo(
    () => particionarMaterias(materias.data ?? []),
    [materias.data],
  );
  const periodos = useMemo(
    () => periodosDisponibles(particion.historicas),
    [particion.historicas],
  );
  const visibles: MateriaDTO[] = useMemo(() => {
    if (vista === 'curso') return particion.actuales;
    return filtrarPorPeriodo(particion.historicas, periodo);
  }, [vista, periodo, particion]);

  const cargando = perfil.isPending || materias.isPending;
  const error = perfil.isError || materias.isError;

  if (cargando) {
    return (
      <EstadoCentrado>
        <ThemedText tone="secondary">Cargando datos académicos...</ThemedText>
      </EstadoCentrado>
    );
  }

  if (error || !perfil.data) {
    return (
      <EstadoCentrado gap>
        <ThemedText tone="secondary">
          No se pudieron cargar los datos académicos.
        </ThemedText>
        <ThemedText
          variant="body"
          weight="semibold"
          style={estilos.reintentar}
          onPress={() => {
            void perfil.refetch();
            void materias.refetch();
          }}>
          Reintentar
        </ThemedText>
      </EstadoCentrado>
    );
  }

  return (
    <FlatList
      data={visibles}
      keyExtractor={(item) => item.id}
      renderItem={({ item }: ListRenderItemInfo<MateriaDTO>) =>
        item.es_actual ? (
          <MateriaActualCard materia={item} />
        ) : (
          <MateriaHistoricaCard materia={item} />
        )
      }
      contentContainerStyle={[
        estilos.contenido,
        { paddingBottom: insets.bottom + spacing.eight },
      ]}
      ItemSeparatorComponent={Separador}
      ListHeaderComponent={
        <View style={estilos.cabecera}>
          <PerfilHeader perfil={perfil.data} />
          <View style={estilos.filaBotones}>
            <ThemedButton
              title="Ver plan de estudios"
              variant="secondary"
              size="sm"
              onPress={() => router.push('/academico/pensum')}
            />
            <ThemedButton
              title="Historial médico"
              variant="secondary"
              size="sm"
              onPress={() => router.push('/academico/historial')}
            />
          </View>
          <View style={estilos.filaChips}>
            <ChipVista
              etiqueta={`En curso (${particion.actuales.length})`}
              activo={vista === 'curso'}
              onPress={() => setVista('curso')}
            />
            <ChipVista
              etiqueta={`Historial (${particion.historicas.length})`}
              activo={vista === 'historial'}
              onPress={() => setVista('historial')}
            />
          </View>
          {vista === 'historial' && periodos.length > 0 ? (
            <View style={estilos.filaChips}>
              <ChipVista
                etiqueta="Todos"
                activo={periodo === null}
                onPress={() => setPeriodo(null)}
              />
              {periodos.map((p) => (
                <ChipVista
                  key={p}
                  etiqueta={p}
                  activo={periodo === p}
                  onPress={() => setPeriodo(p)}
                />
              ))}
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <EstadoCentrado>
          <ThemedText variant="bodyLg" weight="semibold">
            {vista === 'curso' ? 'Sin materias en curso' : 'Sin historial en este período'}
          </ThemedText>
          <ThemedText tone="secondary">
            {vista === 'curso'
              ? 'Cuando UNIMAR publique tu carga actual, aparecerá aquí.'
              : 'Prueba con otro período académico.'}
          </ThemedText>
        </EstadoCentrado>
      }
      refreshControl={
        <RefreshControl
          refreshing={perfil.isRefetching || materias.isRefetching}
          onRefresh={() => {
            void perfil.refetch();
            void materias.refetch();
          }}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    />
  );
}

function ChipVista({
  etiqueta,
  activo,
  onPress,
}: {
  etiqueta: string;
  activo: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <ThemedView variant={activo ? 'sunken' : 'elevated'} style={estilos.chip}>
        <ThemedText variant="caption" weight={activo ? 'semibold' : 'regular'}>
          {etiqueta}
        </ThemedText>
      </ThemedView>
    </Pressable>
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

function Separador() {
  return <View style={estilos.separador} />;
}

const estilos = StyleSheet.create({
  contenido: {
    padding: spacing.four,
    gap: spacing.three,
    backgroundColor: colors.background.base,
  },
  cabecera: {
    gap: spacing.three,
    marginBottom: spacing.one,
  },
  filaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.two,
  },
  filaBotones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.two,
  },
  chip: {
    paddingHorizontal: spacing.three,
    paddingVertical: spacing.two,
    borderRadius: radius.pill,
  },
  separador: {
    height: spacing.three,
  },
  estado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.six,
    gap: spacing.two,
    backgroundColor: colors.background.base,
  },
  estadoConGap: {
    gap: spacing.four,
  },
  reintentar: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
