import { useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeftIcon } from 'phosphor-react-native';

import { aplanarPaginas } from '@/shared/lib/paginar';
import { colors, spacing } from '@/shared/ui';
import {
  CargandoSeccion,
  EmptyState,
  HeaderTab,
  Select,
  ThemedButton,
  ThemedText,
  ThemedView,
  BotonCircular,
} from '@/shared/ui';
import { useComunicadosFeed } from '@/features/comunicaciones/hooks/useComunicadosFeed';
import { NoticiaCompacta } from '@/features/comunicaciones/components/NoticiaCompacta';
import type { Comunicado } from '@/features/comunicaciones/types';

/**
 * Historial completo de noticias PUBLICADO visibles por RLS: dropdown de
 * categoría (se va con el scroll, en el ListHeaderComponent) y scroll
 * infinito (offset del contrato, recientes primero).
 */
export default function ListadoNoticiasScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ categoria?: string }>();
  const [categoria, setCategoria] = useState<string | null>(params.categoria ?? null);

  const feed = useComunicadosFeed(categoria);
  const noticias = useMemo(
    () => (feed.data ? aplanarPaginas(feed.data.pages) : []),
    [feed.data],
  );

  function cambiarCategoria(nueva: string | null) {
    setCategoria(nueva);
  }

  return (
    <ThemedView variant="base" style={estilos.pantalla}>
      <View style={estilos.encabezado}>
        <View style={estilos.filaEncabezado}>
          <BotonCircular label="Volver" onPress={() => router.back()}>
            <ArrowLeftIcon size={20} color={colors.brand.primary} weight="bold" />
          </BotonCircular>
          <HeaderTab titulo="Noticias" />
        </View>
      </View>

      {feed.isPending ? (
        <CargandoSeccion />
      ) : feed.isError ? (
        <ThemedView variant="base" style={estilos.centro}>
          <ThemedText tone="secondary">No se pudo cargar la lista de noticias.</ThemedText>
          <ThemedButton
            title="Reintentar"
            variant="tonal"
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
          // El filtro vive en el header del scroll: al bajar queda atrás y
          // la lista ocupa toda la pantalla. El título (HeaderTab) se queda
          // fijo.
          ListHeaderComponent={
            <View style={estilos.filtros}>
              <View style={estilos.selectCategoria}>
                <Select<string | null>
                  valor={categoria}
                  opciones={CATEGORIAS}
                  onChange={cambiarCategoria}
                  placeholder="Categoría"
                  valorPlaceholder={null}
                  titulo="Filtrar por categoría"
                />
              </View>
            </View>
          }
          // El separador lo pone cada NoticiaCompacta (borderBottom editorial).
          ListEmptyComponent={
            <EmptyState
              title="Sin noticias"
              message="Cuando se publiquen noticias para tu audiencia, aparecerán aquí."
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

/** Opciones del wire (mismas claves que el filtro de la consola). `null` =
 *  sin filtro: el trigger muestra el placeholder "Categoría". */
const CATEGORIAS: { valor: string | null; etiqueta: string }[] = [
  { valor: null, etiqueta: 'Todas' },
  { valor: 'ACADEMICO', etiqueta: 'Académico' },
  { valor: 'EVENTO', etiqueta: 'Eventos' },
  { valor: 'INSTITUCIONAL', etiqueta: 'Institucional' },
];

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  /** El aire fijo y el margen horizontal del header viven aquí: los tabs
   *  hermanos heredan la convención distinta (padding en su scroll), así
   *  que HeaderTab no debe traer padding propio. */
  encabezado: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  filaEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  /** El filtro se alinea con el margen estándar de la lista (el contentContainer
   *  ya trae el padding horizontal) y ocupa solo lo que mide el campo. */
  filtros: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  selectCategoria: {
    alignSelf: 'flex-start',
    minWidth: 180,
    maxWidth: 220,
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
