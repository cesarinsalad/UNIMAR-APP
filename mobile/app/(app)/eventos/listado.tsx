import { useMemo } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Pressable,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarPlusIcon, CalendarCheckIcon } from 'phosphor-react-native';

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
import { useParticipacion } from '@/features/calendario/hooks/useParticipacion';
import { TarjetaProximoEvento } from '@/features/calendario/components/TarjetaProximoEvento';
import type { Evento } from '@/features/calendario/types';

/**
 * Discovery de eventos del campus: OFICIALES visibles por audiencia/RLS +
 * INSTITUCIONALES (fechas fijas), próximos, en orden cronológico, con
 * "agregar a mi agenda" (pivot participar) por tarjeta. El rango de 90
 * días del contrato se recorre con scroll infinito.
 */
export default function ListadoEventosScreen() {
  const insets = useSafeAreaInsets();
  const { eventos: porVentana, paginar } = useEventosListado();
  const participacion = useParticipacion();

  const eventos = useMemo(
    () => (porVentana.data ? aplanarPaginas(porVentana.data.pages) : []),
    [porVentana.data],
  );

  // Agrupar por mes para franjas de encabezado (juntos con el día clave).
  const grupos = useMemo(() => agrupar(eventos), [eventos]);

  return (
    <ThemedView variant="base" style={estilos.pantalla}>
      <HeaderTab titulo="Eventos del campus" />

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
            <View key={item.clave}>
              <SectionHeader title={item.etiqueta} />
              {item.eventos.map((evento) => (
                <FilaEvento
                  key={evento.id}
                  evento={evento}
                  ocupado={
                    participacion.agregar.isPending || participacion.quitar.isPending
                  }
                  onAgregar={() => participacion.agregar.mutate(evento.id)}
                  onQuitar={() => participacion.quitar.mutate(evento.id)}
                />
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

/**
 * Fila de evento del discovery: tarjeta unificada + botón de participación
 * (agregar/quitar). Los INSTITUCIONAL no se agregan (siempre en agenda) y
 * no muestran botón.
 */
function FilaEvento({
  evento,
  ocupado,
  onAgregar,
  onQuitar,
}: {
  evento: Evento;
  ocupado: boolean;
  onAgregar: () => void;
  onQuitar: () => void;
}) {
  const integrable = evento.tipo === 'OFICIAL';
  return (
    <View>
      <TarjetaProximoEvento evento={evento} />
      {integrable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: ocupado }}
          accessibilityLabel={
            evento.participo
              ? `Quitar ${evento.titulo} de tu agenda`
              : `Agregar ${evento.titulo} a tu agenda`
          }
          onPress={!ocupado ? (evento.participo ? onQuitar : onAgregar) : undefined}
          style={[estilos.botonParticipar, evento.participo && estilos.botonParticipado]}>
          {evento.participo ? (
            <CalendarCheckIcon size={18} color={colors.status.success} weight="bold" />
          ) : (
            <CalendarPlusIcon size={18} color={colors.brand.primary} weight="bold" />
          )}
          <ThemedText
            variant="bodySm"
            weight="semibold"
            style={evento.participo ? estilos.etiquetaParticipado : estilos.etiquetaParticipar}>
            {evento.participo ? 'En tu agenda' : 'Agregar a mi agenda'}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
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
  contenido: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.lg,
    gap: 0,
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
  botonParticipar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    marginTop: -(spacing.md),
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.surface,
  },
  botonParticipado: {
    backgroundColor: colors.brand.surfaceBlue,
    borderColor: colors.brand.surfaceBlue,
  },
  etiquetaParticipar: {
    color: colors.brand.primary,
  },
  etiquetaParticipado: {
    color: colors.brand.primary,
  },
});
