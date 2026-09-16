import { useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View as RNView,
  type ListRenderItemInfo,
} from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';

import { aplanarPaginas, siguienteOffset } from '@/shared/lib/paginar';
import { colors, radius, spacing } from '@/shared/ui';
import { ThemedButton, ThemedText, ThemedView } from '@/shared/ui';
import { listarComunicados } from '@/features/comunicaciones/api/comunicados.api';
import { PAGE_SIZE_COMUNICADOS } from '@/features/comunicaciones/hooks/useComunicadosFeed';
import { CLAVES_COMUNICADOS } from '@/features/comunicaciones/hooks/queryKeys';
import { ComunicadoCard } from '@/features/comunicaciones/components/ComunicadoCard';
import type { Comunicado, EstadoComunicado } from '@/features/comunicaciones/types';

const CHIPS: { estado: EstadoComunicado; etiqueta: string }[] = [
  { estado: 'BORRADOR', etiqueta: 'Borradores' },
  { estado: 'PENDIENTE', etiqueta: 'Pendientes' },
  { estado: 'ARCHIVADO', etiqueta: 'Archivados' },
];

export default function MisComunicadosScreen() {
  const [estado, setEstado] = useState<EstadoComunicado>('BORRADOR');
  const insets = useSafeAreaInsets();

  const query = useInfiniteQuery({
    queryKey: CLAVES_COMUNICADOS.mis(estado),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listarComunicados({
        estado,
        limit: PAGE_SIZE_COMUNICADOS,
        offset: pageParam as number,
      }),
    getNextPageParam: (ultima, _todas, ultimoOffset) =>
      siguienteOffset(ultima, ultimoOffset, PAGE_SIZE_COMUNICADOS),
  });

  const comunicados = aplanarPaginas(query.data?.pages);

  return (
    <ThemedView variant="base" style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}>
        {CHIPS.map((chip) => (
          <Pressable key={chip.estado} onPress={() => setEstado(chip.estado)}>
            <ThemedView
              variant={estado === chip.estado ? 'sunken' : 'elevated'}
              style={styles.chip}>
              <ThemedText variant="caption" weight={estado === chip.estado ? 'semibold' : 'regular'}>
                {chip.etiqueta}
              </ThemedText>
            </ThemedView>
          </Pressable>
        ))}
      </ScrollView>

      {query.isPending ? (
        <EstadoCentrado>
          <ThemedText tone="secondary">Cargando...</ThemedText>
        </EstadoCentrado>
      ) : query.isError ? (
        <EstadoCentrado gap>
          <ThemedText tone="secondary">No se pudo cargar la lista.</ThemedText>
          <ThemedButton title="Reintentar" variant="secondary" size="sm" onPress={() => query.refetch()} />
        </EstadoCentrado>
      ) : (
        <FlatList
          data={comunicados}
          keyExtractor={(item) => item.id}
          renderItem={({ item }: ListRenderItemInfo<Comunicado>) => (
            <ComunicadoCard comunicado={item} showEstado />
          )}
          contentContainerStyle={[
            styles.contenido,
            { paddingBottom: insets.bottom + spacing.eight },
          ]}
          ItemSeparatorComponent={Separador}
          ListEmptyComponent={
            <EstadoCentrado>
              <ThemedText variant="bodyLg" weight="semibold">
                Nada aquí
              </ThemedText>
              <ThemedText tone="secondary">
                No hay comunicados en este estado.
              </ThemedText>
              <ThemedButton title="Crear comunicado" size="sm" onPress={() => router.push('/comunicados/nuevo')} />
            </EstadoCentrado>
          }
          ListFooterComponent={query.isFetchingNextPage ? <PieDePagina /> : null}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) {
              void query.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.35}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}

      <RNView />
    </ThemedView>
  );
}
// (El botón flotante de creación vive en el empty-state y en el tab.)

function EstadoCentrado({ children, gap = false }: { children: React.ReactNode; gap?: boolean }) {
  return (
    <ThemedView variant="base" style={[styles.estado, gap && styles.estadoConGap]}>
      {children}
    </ThemedView>
  );
}

function Separador() {
  return <RNView style={styles.separador} />;
}

function PieDePagina() {
  return (
    <ThemedText variant="caption" tone="tertiary" style={styles.footer}>
      Cargando más...
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  chips: {
    paddingHorizontal: spacing.four,
    paddingVertical: spacing.three,
    gap: spacing.two,
  },
  chip: {
    paddingHorizontal: spacing.three,
    paddingVertical: spacing.two,
    borderRadius: radius.pill,
  },
  contenido: {
    padding: spacing.four,
    gap: spacing.three,
    backgroundColor: colors.background.base,
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
  },
  estadoConGap: {
    gap: spacing.four,
  },
  footer: {
    textAlign: 'center',
    paddingVertical: spacing.four,
  },
});