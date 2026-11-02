import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretRightIcon } from 'phosphor-react-native';

import { eliminarEvento } from '@/features/calendario/api/eventos.api';
import { accionesPermitidasEvento } from '@/features/calendario/hooks/eventos-permisos';
import { useEventosListado } from '@/features/calendario/hooks/useEventosListado';
import { useMutacionEvento } from '@/features/calendario/hooks/useMutacionEvento';
import { colorBarra, horaRango } from '@/features/calendario/components/TarjetaProximoEvento';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { etiquetaAudiencia } from '@/shared/lib/etiquetas';
import { aplanarPaginas } from '@/shared/lib/paginar';
import { ApiError } from '@/shared/api/axios';
import { colors, radius, spacing } from '@/shared/ui';
import {
  EmptyState,
  ModalConfirmacion,
  SectionHeader,
  ThemedButton,
  ThemedText,
  ThemedView,
  useEsDesktop,
} from '@/shared/ui';
import type { Evento } from '@/features/calendario/types';

const FORMATO_FECHA = new Intl.DateTimeFormat('es-VE', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

const ETIQUETA_TIPO: Record<Evento['tipo'], string> = {
  PERSONAL: 'Personal',
  OFICIAL: 'Oficial',
  INSTITUCIONAL: 'Institucional',
  FERIADO: 'Feriado',
};

function verDetalle(evento: Evento) {
  router.push(`/eventos/${evento.id}` as never);
}

/**
 * Gestión de eventos de la consola: lo que el rol puede tocar en los
 * próximos 90 días (ADMIN: todo lo visible; comunicador: lo que él creó;
 * personal: solo lo propio — espejo de accionesPermitidasEvento). Tabla de
 * filas en desktop, cards en móvil; la card móvil abre el DETALLE, donde
 * viven editar/eliminar con confirmación (sin botones duplicados por
 * fila; Alert.alert es no-op en web).
 */
export function EventosSeccion() {
  const insets = useSafeAreaInsets();
  const esDesktop = useEsDesktop();
  const usuario = useSesionStore((s) => s.usuario);
  const { eventos: porVentana, paginar } = useEventosListado();

  const gestionables = useMemo(() => {
    if (!porVentana.data) return [];
    return aplanarPaginas(porVentana.data.pages).filter((evento) =>
      accionesPermitidasEvento({
        rol: usuario?.rol ?? null,
        esDueno: evento.usuarioId === usuario?.id,
        tipo: evento.tipo,
      }).puedeEditar,
    );
  }, [porVentana.data, usuario]);

  const eliminar = useMutacionEvento((id: string) => eliminarEvento(id));
  const [porBorrar, setPorBorrar] = useState<Evento | null>(null);
  const [errorFila, setErrorFila] = useState<string | null>(null);

  async function borrar(evento: Evento) {
    setErrorFila(null);
    try {
      await eliminar.mutateAsync(evento.id);
    } catch (e) {
      setErrorFila(
        e instanceof ApiError ? e.message : 'No se pudo eliminar. Verifica tu conexión.',
      );
    }
  }

  function renderItem({ item }: ListRenderItemInfo<Evento>) {
    return esDesktop ? (
      <FilaTabla
        evento={item}
        onEditar={() => router.push(`/eventos/nuevo?id=${item.id}` as never)}
        onEliminar={() => setPorBorrar(item)}
      />
    ) : (
      <TarjetaEvento evento={item} />
    );
  }

  return (
    <ThemedView variant="base" style={estilos.pane}>
      <SectionHeader
        title="Eventos"
        action={
          <ThemedText variant="caption" tone="secondary">
            Próximos 90 días
          </ThemedText>
        }
        style={estilos.cabecera}
      />
      {errorFila ? (
        <ThemedText variant="caption" style={estilos.errorTexto}>
          {errorFila}
        </ThemedText>
      ) : null}

      {porVentana.isPending ? (
        <EstadoCentrado>
          <ThemedText tone="secondary">Cargando eventos...</ThemedText>
        </EstadoCentrado>
      ) : porVentana.isError ? (
        <EstadoCentrado gap>
          <ThemedText tone="secondary">No se pudo cargar la lista de eventos.</ThemedText>
          <ThemedButton
            title="Reintentar"
            variant="secondary"
            size="sm"
            onPress={() => void porVentana.refetch()}
          />
        </EstadoCentrado>
      ) : (
        <FlatList
          data={gestionables}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            esDesktop ? estilos.contenidoTabla : estilos.contenido,
            { paddingBottom: insets.bottom + spacing.eight },
          ]}
          ItemSeparatorComponent={esDesktop ? SeparadorFino : Separador}
          ListHeaderComponent={
            esDesktop ? (
              <View style={estilos.cabeceraTabla}>
                <ThemedText variant="caption" tone="tertiary" style={estilos.colTitulo}>
                  Título
                </ThemedText>
                <ThemedText variant="caption" tone="tertiary" style={estilos.colTipo}>
                  Tipo
                </ThemedText>
                <ThemedText variant="caption" tone="tertiary" style={estilos.colFecha}>
                  Fecha
                </ThemedText>
                <ThemedText variant="caption" tone="tertiary" style={estilos.colAudiencia}>
                  Audiencia
                </ThemedText>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              title="Sin eventos gestionables"
              message="No aparece nada cuyas acciones te correspondan en los próximos 90 días."
            />
          }
          ListFooterComponent={
            porVentana.isFetchingNextPage ? (
              <ThemedText variant="caption" tone="tertiary" style={estilos.footer}>
                Cargando más eventos...
              </ThemedText>
            ) : null
          }
          onEndReached={paginar}
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

      <ModalConfirmacion
        visible={porBorrar !== null}
        titulo="Eliminar evento"
        mensaje={porBorrar ? `¿Eliminar "${porBorrar.titulo}"? Esta acción no se puede deshacer.` : ''}
        textoConfirmar="Eliminar"
        destructive
        cargando={eliminar.isPending}
        onConfirmar={() => {
          const objetivo = porBorrar;
          setPorBorrar(null);
          if (objetivo) void borrar(objetivo);
        }}
        onCancelar={() => setPorBorrar(null)}
      />
    </ThemedView>
  );
}

/** Fila de la tabla desktop, con la fila-tranca de color por naturaleza. */
function FilaTabla({
  evento,
  onEditar,
  onEliminar,
}: {
  evento: Evento;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={evento.titulo}
      onPress={() => verDetalle(evento)}>
      <ThemedView variant="card" style={estilos.filaTabla}>
        <View style={[estilos.barra, { backgroundColor: colorBarra(evento) }]} />
        <View style={estilos.colTitulo}>
          <ThemedText variant="bodySm" weight="semibold" numberOfLines={2}>
            {evento.titulo}
          </ThemedText>
        </View>
        <ThemedText variant="caption" tone="secondary" style={estilos.colTipo}>
          {ETIQUETA_TIPO[evento.tipo]}
        </ThemedText>
        <ThemedText variant="caption" tone="secondary" style={estilos.colFecha} numberOfLines={1}>
          {`${FORMATO_FECHA.format(new Date(evento.inicioAt))} · ${
            evento.diaCompleto ? 'Todo el día' : horaRango(evento)
          }`}
        </ThemedText>
        <ThemedText variant="caption" tone="secondary" style={estilos.colAudiencia} numberOfLines={1}>
          {evento.tipo === 'OFICIAL' ? etiquetaAudiencia(evento.decanatoIds) : '—'}
        </ThemedText>
        <Acciones onEditar={onEditar} onEliminar={onEliminar} />
      </ThemedView>
    </Pressable>
  );
}

/** Card móvil: barra de color + título + meta apilada; el detalle edita. */
function TarjetaEvento({ evento }: { evento: Evento }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={evento.titulo}
      onPress={() => verDetalle(evento)}>
      <ThemedView variant="card" style={estilos.tarjeta}>
        <View style={estilos.tarjetaFila}>
          <View style={[estilos.barra, { backgroundColor: colorBarra(evento) }]} />
          <View style={estilos.tarjetaCuerpo}>
            <ThemedText variant="body" weight="semibold" numberOfLines={2}>
              {evento.titulo}
            </ThemedText>
            <ThemedText variant="caption" tone="secondary" numberOfLines={1}>
              {`${ETIQUETA_TIPO[evento.tipo]} · ${FORMATO_FECHA.format(new Date(evento.inicioAt))} · ${
                evento.diaCompleto ? 'Todo el día' : horaRango(evento)
              }`}
            </ThemedText>
            {evento.tipo === 'OFICIAL' ? (
              <ThemedText variant="caption" tone="tertiary" numberOfLines={1}>
                {etiquetaAudiencia(evento.decanatoIds)}
              </ThemedText>
            ) : null}
          </View>
          <CaretRightIcon size={16} color={colors.text.tertiary} />
        </View>
      </ThemedView>
    </Pressable>
  );
}

function Acciones({
  onEditar,
  onEliminar,
}: {
  onEditar: () => void;
  onEliminar: () => void;
}) {
  return (
    <View style={estilos.acciones}>
      <ThemedButton title="Editar" variant="secondary" size="sm" onPress={onEditar} />
      <ThemedButton title="Eliminar" variant="ghost" size="sm" onPress={onEliminar} />
    </View>
  );
}

function EstadoCentrado({ children, gap = false }: { children: React.ReactNode; gap?: boolean }) {
  return (
    <ThemedView variant="base" style={[estilos.estado, gap && estilos.estadoConGap]}>
      {children}
    </ThemedView>
  );
}

function Separador() {
  return <View style={estilos.separador} />;
}

function SeparadorFino() {
  return <View style={estilos.separadorFino} />;
}

const estilos = StyleSheet.create({
  pane: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  cabecera: {
    paddingHorizontal: spacing.four,
    paddingTop: spacing.four,
  },
  errorTexto: {
    color: colors.status.danger,
    paddingHorizontal: spacing.four,
  },
  contenido: {
    padding: spacing.four,
    paddingTop: spacing.two,
    gap: spacing.three,
  },
  contenidoTabla: {
    paddingHorizontal: spacing.four,
    paddingTop: spacing.one,
    gap: spacing.sm,
  },
  cabeceraTabla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.five,
    paddingBottom: spacing.xs,
  },
  filaTabla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.four,
  },
  barra: {
    width: 3,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.primary,
  },
  colTitulo: { flex: 2 },
  colTipo: { width: 96 },
  colFecha: { flex: 1.2 },
  colAudiencia: { width: 120 },
  acciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tarjeta: { gap: spacing.sm },
  tarjetaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tarjetaCuerpo: { flex: 1, gap: 2 },
  separador: { height: spacing.three },
  separadorFino: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
    marginHorizontal: spacing.four,
  },
  estado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.six,
    gap: spacing.two,
  },
  estadoConGap: { gap: spacing.four },
  footer: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
