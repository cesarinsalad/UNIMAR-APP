import { useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Pressable,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { MagnifyingGlassIcon, XCircleIcon } from 'phosphor-react-native';

import { aplanarPaginas } from '@/shared/lib/paginar';
import { useDebounced } from '@/shared/lib/useDebounced';
import { colors, radius, spacing } from '@/shared/ui';
import {
  CargandoSeccion,
  EmptyState,
  HeaderTab,
  TextField,
  ThemedButton,
  ThemedText,
  ThemedView,
} from '@/shared/ui';
import { useComunicadosFeed } from '@/features/comunicaciones/hooks/useComunicadosFeed';
import { NoticiaCompacta } from '@/features/comunicaciones/components/NoticiaCompacta';
import type { Comunicado } from '@/features/comunicaciones/types';

/**
 * Historial completo de noticias PUBLICADO visibles por RLS: búsqueda
 * textual (q del BFF, ILIKE en el título con debounce de 300 ms), chips de
 * categoría y scroll infinito (offset del contrato, recientes primero).
 */
export default function ListadoNoticiasScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ categoria?: string }>();
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState<string | null>(params.categoria ?? null);
  const q = useDebounced(busqueda.trim(), 300);

  const feed = useComunicadosFeed(categoria, q || null);
  const noticias = useMemo(
    () => (feed.data ? aplanarPaginas(feed.data.pages) : []),
    [feed.data],
  );

  function cambiarCategoria(nueva: string | null) {
    setCategoria(nueva);
  }

  return (
    <ThemedView variant="base" style={estilos.pantalla}>
      <HeaderTab titulo="Noticias" />

      <ThemedView variant="base" style={estilos.filtros}>
        <TextField
          placeholder="Buscar por título..."
          value={busqueda}
          onChangeText={setBusqueda}
          accessibilityLabel="Buscar noticias por título"
          rightElement={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
              hitSlop={8}
              onPress={() => setBusqueda('')}>
              {busqueda.length > 0 ? (
                <XCircleIcon size={20} color={colors.text.secondary} weight="fill" />
              ) : (
                <MagnifyingGlassIcon size={20} color={colors.text.secondary} />
              )}
            </Pressable>
          }
        />
      </ThemedView>
      <ChipsCategoria seleccion={categoria} onSeleccionar={cambiarCategoria} />

      {feed.isPending ? (
        <CargandoSeccion />
      ) : feed.isError ? (
        <ThemedView variant="base" style={estilos.centro}>
          <ThemedText tone="secondary">No se pudo cargar la lista de noticias.</ThemedText>
          <ThemedButton
            title="Reintentar"
            variant="secondary"
            size="sm"
            onPress={() => void feed.refetch()}
          />
        </ThemedView>
      ) : (
        <FlatList
          data={noticias}
          keyExtractor={(item) => item.id}
          renderItem={({ item }: ListRenderItemInfo<Comunicado>) => (
            <NoticiaCompacta comunicado={item} />
          )}
          contentContainerStyle={[
            estilos.contenido,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}
          // El separador lo pone cada NoticiaCompacta (borderBottom editorial).
          ListEmptyComponent={
            <EmptyState
              title={q ? 'Sin resultados' : 'Sin noticias'}
              message={
                q
                  ? 'Ninguna noticia coincide con tu búsqueda para esta categoría.'
                  : 'Cuando se publiquen noticias para tu audiencia, aparecerán aquí.'
              }
            />
          }
          ListFooterComponent={
            feed.isFetchingNextPage ? <ThemedText variant="caption" tone="tertiary" style={estilos.footer}>Cargando más...</ThemedText> : null
          }
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) {
              void feed.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.35}
          refreshControl={
            <RefreshControl
              refreshing={feed.isRefetching}
              onRefresh={() => void feed.refetch()}
              colors={[colors.brand.primary]}
              tintColor={colors.brand.primary}
            />
          }
        />
      )}
    </ThemedView>
  );
}

const CHIPS: { valor: string | null; etiqueta: string }[] = [
  { valor: null, etiqueta: 'Todas' },
  { valor: 'ACADEMICO', etiqueta: 'Académico' },
  { valor: 'EVENTO', etiqueta: 'Eventos' },
  { valor: 'INSTITUCIONAL', etiqueta: 'Institucional' },
];

function ChipsCategoria({
  seleccion,
  onSeleccionar,
}: {
  seleccion: string | null;
  onSeleccionar: (v: string | null) => void;
}) {
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={CHIPS}
      keyExtractor={(chip) => chip.etiqueta}
      contentContainerStyle={estilos.chips}
      renderItem={({ item }) => {
        const activo = item.valor === seleccion;
        return (
          <Pressable onPress={() => onSeleccionar(item.valor)} accessibilityRole="button">
            <ThemedView variant={activo ? 'sunken' : 'elevated'} style={estilos.chip}>
              <ThemedText variant="caption" weight={activo ? 'semibold' : 'regular'}>
                {item.etiqueta}
              </ThemedText>
            </ThemedView>
          </Pressable>
        );
      }}
    />
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  filtros: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  chips: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  contenido: {
    paddingHorizontal: spacing.lg,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  footer: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
