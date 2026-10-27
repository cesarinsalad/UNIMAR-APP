import { useMemo } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { aplanarPaginas } from '@/shared/lib/paginar';
import { colors, layout, spacing } from '@/shared/ui';
import {
  CargandoSeccion,
  EmptyState,
  HeaderTab,
  SectionHeader,
  ThemedButton,
  ThemedText,
  ThemedView,
} from '@/shared/ui';
import { useEventosListado } from '@/features/calendario/hooks/useEventosListado';
import { TarjetaProximoEvento } from '@/features/calendario/components/TarjetaProximoEvento';
import type { Evento } from '@/features/calendario/types';

/**
 * Discovery de eventos del campus: OFICIALES visibles por audiencia/RLS +
 * INSTITUCIONALES (fechas fijas), próximos, en orden cronológico. La
 * participación (agregar/quitar agenda) vive SOLO en el detalle
 * (/eventos/[id]) para no recargar el listado.
 */
export default function ListadoEventosScreen() {
  const insets = useSafeAreaInsets();
  const { eventos: porVentana, paginar } = useEventosListado();

  const eventos = useMemo(
    () => (porVentana.data ? aplanarPaginas(porVentana.data.pages) : []),
    [porVentana.data],
  );

  // Agrupar por mes para franjas de encabezado (juntos con el día clave).
  const grupos = useMemo(() => agrupar(eventos), [eventos]);

  return (
    <ThemedView variant="base" style={estilos.pantalla}>
      <View style={estilos.encabezado}>
        <HeaderTab titulo="Eventos del campus" />
      </View>

      {porVentana.isPending ? (
        <CargandoSeccion />
      ) : porVentana.isError ? (
        <ThemedView variant="base" style={estilos.centro}>
          <ThemedText tone="secondary">No se pudo cargar la lista de eventos.</ThemedText>
          <ThemedButton
            title="Reintentar"
            variant="secondary"
            size="sm"
            onPress={() => void porVentana.refetch()}
          />
        </ThemedView>
      ) : (
        <FlatList
          data={grupos}
          keyExtractor={(g) => g.clave}
          contentContainerStyle={[
            estilos.contenido,
            { paddingBottom: insets.bottom + layout.bottomTabInset },
          ]}
          renderItem={({ item }) => (
            <View key={item.clave} style={estilos.grupo}>
              <SectionHeader title={item.etiqueta} />
              {item.eventos.map((evento) => (
                <TarjetaProximoEvento key={evento.id} evento={evento} />
              ))}
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              title="Sin eventos próximos"
              message="Cuando la universidad publique eventos para tu audiencia, aparecerán aquí."
            />
          }
          ListFooterComponent={
            porVentana.isFetchingNextPage ? (
              <ThemedText variant="caption" tone="tertiary" style={estilos.footer}>
                Cargando más eventos...
              </ThemedText>
            ) : null
          }
          onEndReached={() => paginar()}
          onEndReachedThreshold={0.35}
          refreshControl={
            <RefreshControl
              refreshing={porVentana.isRefetching}
              onRefresh={() => void porVentana.refetch()}
              colors={[colors.brand.primary]}
              tintColor={colors.brand.primary}
            />
          }
        />
      )}
    </ThemedView>
  );
}

interface GrupoMes {
  clave: string;
  etiqueta: string;
  eventos: Evento[];
}

/** Agrupa por mes para las franjas del listado. */
function agrupar(eventos: Evento[]): GrupoMes[] {
  const mapa = new Map<string, GrupoMes>();
  for (const evento of eventos) {
    const fecha = new Date(evento.inicioAt);
    const claveMes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    const grupo = mapa.get(claveMes) ??
      {
        clave: claveMes,
        etiqueta: fecha.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' }),
        eventos: [],
      };
    grupo.eventos.push(evento);
    mapa.set(claveMes, grupo);
  }
  return [...mapa.values()];
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  /** Aire fijo y margen horizontal del header: HeaderTab no trae padding
   *  propio (los tabs hermanos lo llevan en su scroll). */
  encabezado: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  contenido: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: 0,
  },
  /** Entre cards y entre grupos: el shadow de TarjetaProximoEvento necesita
   *  aire para respirar (el File-team sentía las filas pegadas). */
  grupo: {
    gap: spacing.md,
    marginBottom: spacing.xl,
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
