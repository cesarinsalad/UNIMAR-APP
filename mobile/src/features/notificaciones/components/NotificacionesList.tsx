import { Fragment, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BellSlashIcon, WarningCircleIcon } from 'phosphor-react-native';

import {
  EmptyState,
  SeparadorFino,
  Skeleton,
  SkeletonGroup,
  ThemedButton,
  ThemedText,
  colors,
  radius,
  spacing,
} from '@/shared/ui';
import type { Notificacion } from '../types';
import { aplanarPaginas, useNotificaciones } from '../hooks/useNotificaciones';
import { agruparPorDia, type GrupoDia } from '../grupos';
import { NotificacionFila } from './NotificacionFila';

/**
 * Bandeja como registro cronológico: un documento blanco por día (Hoy /
 * Ayer / fecha) con filas hairline dentro. La agrupación por día es el eje
 * de lectura — dentro del documento la hora basta — y evita la pila de
 * tarjetas idénticas que competían entre sí.
 */
export function NotificacionesList({
  onAbrir,
}: {
  onAbrir: (notificacion: Notificacion) => void;
}) {
  const query = useNotificaciones();
  const insets = useSafeAreaInsets();

  const notificaciones = useMemo(
    () => aplanarPaginas(query.data?.pages),
    [query.data],
  );
  const grupos = useMemo(() => agruparPorDia(notificaciones), [notificaciones]);

  if (query.isPending) {
    return <CargandoBandeja />;
  }

  if (query.isError) {
    return (
      <View style={[estilos.contenido, estilos.contenidoCentrado]}>
        <EmptyState
          icon={
            <WarningCircleIcon size={32} color={colors.status.danger} weight="regular" />
          }
          title="No se pudo cargar la bandeja"
          message="Inténtalo de nuevo en unos segundos."
          action={
            <ThemedButton
              title="Reintentar"
              variant="secondary"
              size="sm"
              onPress={() => void query.refetch()}
            />
          }
        />
        <ThemedText
          variant="caption"
          tone="tertiary"
          numberOfLines={3}
          style={estilos.detalleError}>
          {query.error.message}
        </ThemedText>
      </View>
    );
  }

  const vacia = notificaciones.length === 0;

  return (
    <FlatList
      data={grupos}
      keyExtractor={(grupo) => grupo.clave}
      renderItem={({ item }) => (
        <SeccionDia grupo={item} onAbrir={onAbrir} />
      )}
      contentContainerStyle={[
        estilos.contenido,
        vacia && estilos.contenidoCentrado,
        { paddingBottom: insets.bottom + spacing.xxl },
      ]}
      ItemSeparatorComponent={SeparadorGrupo}
      ListEmptyComponent={<BandejaVacia />}
      ListFooterComponent={
        query.isFetchingNextPage ? <PieDePagina /> : null
      }
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) {
          void query.fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.35}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          colors={[colors.brand.primary]}
          tintColor={colors.brand.primary}
        />
      }
    />
  );
}

/** Un día = una superficie plana: membrete de fecha + filas hairline. */
function SeccionDia({
  grupo,
  onAbrir,
}: {
  grupo: GrupoDia;
  onAbrir: (notificacion: Notificacion) => void;
}) {
  return (
    <View style={estilos.grupo}>
      <ThemedText variant="caption" weight="semibold" style={estilos.chipTexto}>
        {grupo.etiqueta}
      </ThemedText>
      <View style={estilos.documento}>
        {grupo.notificaciones.map((notificacion, indice) => (
          <Fragment key={notificacion.id}>
            {indice > 0 ? <SeparadorFino /> : null}
            <NotificacionFila
              notificacion={notificacion}
              onAbrir={onAbrir}
            />
          </Fragment>
        ))}
      </View>
    </View>
  );
}

function CargandoBandeja() {
  return (
    <SkeletonGroup
      label="Cargando notificaciones"
      style={[estilos.contenido, estilos.cargando]}>
      {[0, 1].map((seccion) => (
        <View key={seccion} style={estilos.grupo}>
          <Skeleton style={estilos.esqueletoChip} />
          <View style={estilos.esqueletoDocumento}>
            {[0, 1, 2].map((fila) => (
              <View key={fila} style={estilos.esqueletoFila}>
                <Skeleton style={estilos.esqueletoIcono} />
                <View style={estilos.esqueletoTextos}>
                  <Skeleton style={estilos.esqueletoTitulo} />
                  <Skeleton style={estilos.esqueletoCuerpo} />
                  <Skeleton style={estilos.esqueletoMeta} />
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );
}

function BandejaVacia() {
  return (
    <EmptyState
      icon={<BellSlashIcon size={32} color={colors.text.secondary} weight="regular" />}
      title="Sin novedades"
      message="Cuando se publiquen comunicados o eventos de tu interés, aparecerán aquí."
      action={
        <ThemedButton
          title="Ver noticias"
          variant="secondary"
          size="sm"
          onPress={() => router.navigate('/comunicados')}
        />
      }
    />
  );
}

function SeparadorGrupo() {
  return <View style={estilos.separadorGrupo} />;
}

function PieDePagina() {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando más novedades"
      style={estilos.pie}>
      <ActivityIndicator size="small" color={colors.brand.primary} />
      <ThemedText variant="caption" tone="secondary">
        Cargando más novedades…
      </ThemedText>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  contenidoCentrado: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 0,
  },
  cargando: {
    gap: spacing.lg,
  },
  grupo: {
    gap: spacing.xs,
  },
  separadorGrupo: {
    height: spacing.lg,
  },
  /** Membrete de fecha: solo texto, MAYÚSCULAS semibold con tracking. Sin
   *  cápsula: la fecha ordena la lectura, no compite con el contenido. Va
   *  en `text.primary` (no atenuado): es el eje del registro. */
  chipTexto: {
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  documento: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.card,
    // Recorta el ripple en las esquinas sin elevar el registro: la
    // proximidad y los hairlines bastan para delimitar cada día.
    overflow: 'hidden',
  },
  detalleError: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  esqueletoChip: {
    width: 48,
    height: 12,
    borderRadius: radius.sm,
  },
  esqueletoDocumento: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.card,
  },
  esqueletoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  esqueletoIcono: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
  },
  esqueletoTextos: {
    flex: 1,
    gap: spacing.xs,
  },
  esqueletoTitulo: {
    width: '70%',
    height: 12,
  },
  esqueletoCuerpo: {
    width: '90%',
    height: 12,
  },
  esqueletoMeta: {
    width: '45%',
    height: 12,
  },
});
