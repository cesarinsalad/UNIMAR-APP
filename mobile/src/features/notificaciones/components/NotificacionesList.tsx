import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View as RNView,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';
import type { Notificacion } from '../types';
import { aplanarPaginas, useNotificaciones } from '../hooks/useNotificaciones';
import { NotificacionCard } from './NotificacionCard';

export function NotificacionesList({
  onAbrir,
}: {
  onAbrir: (notificacion: Notificacion) => void;
}) {
  const query = useNotificaciones();
  const insets = useSafeAreaInsets();

  const notificaciones = aplanarPaginas(query.data?.pages);

  if (query.isPending) {
    return (
      <EstadoCentrado>
        <ThemedText tone="secondary">Cargando bandeja...</ThemedText>
      </EstadoCentrado>
    );
  }

  if (query.isError) {
    return (
      <EstadoCentrado gap>
        <ThemedText tone="secondary">No se pudo cargar la bandeja.</ThemedText>
        <ThemedText variant="caption" tone="tertiary" style={styles.errorDetalle}>
          {query.error.message}
        </ThemedText>
        <ThemedText
          variant="body"
          weight="semibold"
          style={styles.reintentar}
          onPress={() => query.refetch()}>
          Reintentar
        </ThemedText>
      </EstadoCentrado>
    );
  }

  return (
    <FlatList
      data={notificaciones}
      keyExtractor={(item) => item.id}
      renderItem={({ item }: ListRenderItemInfo<Notificacion>) => (
        <NotificacionCard notificacion={item} onAbrir={onAbrir} />
      )}
      contentContainerStyle={[
        styles.contenido,
        { paddingBottom: insets.bottom + spacing.eight },
      ]}
      ItemSeparatorComponent={Separador}
      ListEmptyComponent={
        <EstadoCentrado>
          <ThemedText variant="bodyLg" weight="semibold">
            No hay notificaciones
          </ThemedText>
          <ThemedText tone="secondary">
            Cuando se publiquen comunicados o eventos de tu interés, aparecerán aquí.
          </ThemedText>
        </EstadoCentrado>
      }
      ListFooterComponent={
        query.isFetchingNextPage ? <PieDePagina /> : null
      }
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
    backgroundColor: colors.background.base,
  },
  estadoConGap: {
    gap: spacing.four,
  },
  errorDetalle: {
    textAlign: 'center',
  },
  reintentar: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  footer: {
    textAlign: 'center',
    paddingVertical: spacing.four,
  },
});