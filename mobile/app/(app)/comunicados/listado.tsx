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
  Chip,
  EmptyState,
  HeaderTab,
  ThemedButton,
  ThemedText,
  ThemedView,
  BotonCircular,
} from '@/shared/ui';
import { useComunicadosFeed } from '@/features/comunicaciones/hooks/useComunicadosFeed';
import { NoticiaCompacta } from '@/features/comunicaciones/components/NoticiaCompacta';
import type { Comunicado } from '@/features/comunicaciones/types';

/**
 * Historial completo de noticias PUBLICADO visibles por RLS: chips de
 * categoría (se van con el scroll, en el ListHeaderComponent) y scroll
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
          // Los selectores viven en el header del scroll: al bajar quedan
          // atrás y la lista ocupa toda la pantalla. El título (HeaderTab)
          // se queda fijo.
          ListHeaderComponent={
            <ChipsCategoria seleccion={categoria} onSeleccionar={cambiarCategoria} />
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

const CHIPS: { valor: string | null; etiqueta: string }[] = [
  { valor: null, etiqueta: 'Todas' },
  { valor: 'ACADEMICO', etiqueta: 'Académico' },
  { valor: 'EVENTO', etiqueta: 'Eventos' },
  { valor: 'INSTITUCIONAL', etiqueta: 'Institucional' },
];

/** Selectores de categoría: el Chip compartido del sistema (activa = tinte
 *  azul sobre tinta azul; inactiva = pill blanca). */
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
      renderItem={({ item }) => (
        <Chip
          etiqueta={item.etiqueta}
          activa={item.valor === seleccion}
          size="sm"
          onPress={() => onSeleccionar(item.valor)}
        />
      )}
    />
  );
}

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
  },
  filaEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  chips: {
    // Sin padding horizontal: vive dentro del contentContainer de la lista
    // (estilos.contenido), que ya alinea con el margen estándar — un
    // paddingHorizontal propio duplicaba la sangría inicial de los chips.
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
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
