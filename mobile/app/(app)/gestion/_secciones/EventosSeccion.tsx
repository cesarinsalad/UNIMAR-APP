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
import { FORMATO_FECHA_CORTO_CON_DIA } from '@/shared/lib/formatos';
import { ApiError } from '@/shared/api/axios';
import { colors, radius, spacing } from '@/shared/ui';
import {
  Chip,
  EmptyState,
  EstadoCentrado,
  ModalConfirmacion,
  Separador,
  SeparadorFino,
  SkeletonCard,
  TextoError,
  ThemedButton,
  ThemedText,
  ThemedView,
  useEsDesktop,
} from '@/shared/ui';
import type { Evento } from '@/features/calendario/types';
import { FormularioEvento } from './FormularioEvento';

const ETIQUETA_TIPO: Record<Evento['tipo'], string> = {
  PERSONAL: 'Personal',
  OFICIAL: 'Oficial',
  INSTITUCIONAL: 'Institucional',
  FERIADO: 'Feriado',
};

const TIPOS_FILTRO: { valor: Evento['tipo'] | ''; etiqueta: string }[] = [
  { valor: '', etiqueta: 'Todos' },
  { valor: 'OFICIAL', etiqueta: 'Oficiales' },
  { valor: 'INSTITUCIONAL', etiqueta: 'Institucionales' },
];

function verDetalle(evento: Evento) {
  router.push(`/eventos/${evento.id}` as never);
}

/** Estado de la sección: lista, creación inline o edición inline (form propio). */
export type ModoEventos =
  | { vista: 'lista' }
  | { vista: 'crear' }
  | { vista: 'editar'; id: string };

export interface EventosSeccionProps {
  modo: ModoEventos;
  onModo: (modo: ModoEventos) => void;
}

/**
 * Gestión de eventos de la consola: lo que el rol puede tocar en los
 * próximos 90 días (ADMIN: todo lo oficial/institucional visible;
 * comunicador: lo que él creó). Los PERSONALES no se gestionan aquí —
 * viven en el tab calendario de la app (creación/edición propias del
 * dueño); la consola los excluye antes del filtro de permisos. Filtro
 * por tipo en cliente dentro de la ventana (el BFF no filtra tipo).
 * Tabla de filas en desktop, cards en móvil; la card móvil abre el
 * DETALLE, donde viven editar/eliminar con confirmación (sin botones
 * duplicados por fila; Alert.alert es no-op en web).
 */
export function EventosSeccion({ modo, onModo }: EventosSeccionProps) {
  const insets = useSafeAreaInsets();
  const esDesktop = useEsDesktop();
  const usuario = useSesionStore((s) => s.usuario);
  const { eventos: porVentana, paginar } = useEventosListado();

  const [tipoFiltro, setTipoFiltro] = useState<Evento['tipo'] | ''>('');

  const gestionables = useMemo(() => {
    if (!porVentana.data) return [];
    // aplanarPaginas tolera páginas {items,total} y arrays del wire legacy.
    const todos = aplanarPaginas(porVentana.data.pages);
    return todos
      // Los personales NO se gestionan desde la consola: viven en el tab
      // calendario (el ADMIN tampoco edita personales ajenos: 403 del BFF).
      .filter((evento) => evento.tipo !== 'PERSONAL')
      .filter((evento) =>
        accionesPermitidasEvento({
          rol: usuario?.rol ?? null,
          esDueno: evento.usuarioId === usuario?.id,
          tipo: evento.tipo,
        }).puedeEditar,
      )
      .filter((evento) => !tipoFiltro || evento.tipo === tipoFiltro);
  }, [porVentana.data, usuario, tipoFiltro]);

  const eliminar = useMutacionEvento((id: string) => eliminarEvento(id));
  const [filaBorrando, setFilaBorrando] = useState<string | null>(null);
  const [erroresFila, setErroresFila] = useState<Record<string, string>>({});
  const [porBorrar, setPorBorrar] = useState<Evento | null>(null);

  function limpiarErrorFila(id: string) {
    setErroresFila((prev) => {
      if (!(id in prev)) return prev;
      const { [id]: _descartado, ...resto } = prev;
      return resto;
    });
  }

  async function borrar(evento: Evento) {
    limpiarErrorFila(evento.id);
    setFilaBorrando(evento.id);
    try {
      await eliminar.mutateAsync(evento.id);
    } catch (e) {
      setErroresFila((prev) => ({
        ...prev,
        [evento.id]:
          e instanceof ApiError ? e.message : 'No se pudo eliminar. Verifica tu conexión.',
      }));
    } finally {
      setFilaBorrando(null);
    }
  }

  function renderItem({ item }: ListRenderItemInfo<Evento>) {
    const errorFila = erroresFila[item.id];
    const borrando = filaBorrando === item.id;
    if (esDesktop) {
      return (
        <View>
          <FilaTabla
            evento={item}
            acabandoBorrar={borrando}
            onEditar={() => onModo({ vista: 'editar', id: item.id })}
            onEliminar={() => setPorBorrar(item)}
          />
          {errorFila ? <TextoError>{errorFila}</TextoError> : null}
        </View>
      );
    }
    return (
      <TarjetaEvento evento={item} error={errorFila} eliminando={borrando} />
    );
  }

  // Crear/editar inline: el formulario propio de la consola reemplaza la
  // lista dentro del shell (la sidebar/nav permanece visible).
  if (modo.vista !== 'lista') {
    return (
      <FormularioEvento
        eventoId={modo.vista === 'editar' ? modo.id : null}
        onCerrar={() => onModo({ vista: 'lista' })}
      />
    );
  }

  return (
    <ThemedView variant="base" style={estilos.pane}>
      {/* Sobretítulo eyebrow de la casa (mismo gesto que el Panel): el
          label del tema se funde con la ventana de 90 días — sin repetir
          el "Eventos" del chip de nav con otro subtítulo grande. La acción
          de crear vive aquí (contexto correcto), no solo en el Panel. */}
      <View style={estilos.cabecera}>
        <ThemedText variant="caption" style={estilos.eyebrow} numberOfLines={1}>
          Eventos · próximos 90 días
        </ThemedText>
        <ThemedButton
          title="Nuevo evento"
          variant="secondary"
          size="sm"
          onPress={() => onModo({ vista: 'crear' })}
        />
      </View>

      {/* Filtro por tipo (cliente, dentro de la ventana de 90 días). */}
      <View style={estilos.filaTipos}>
        {TIPOS_FILTRO.map((chip) => (
          <Chip
            key={chip.valor}
            etiqueta={chip.etiqueta}
            activa={tipoFiltro === chip.valor}
            onPress={() => setTipoFiltro(chip.valor)}
          />
        ))}
      </View>

      {porVentana.isPending ? (
        <EsqueletoEventos esDesktop={esDesktop} />
      ) : porVentana.isError ? (
        <EstadoCentrado gap>
          <TextoError>No se pudo cargar la lista de eventos.</TextoError>
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
            tipoFiltro ? (
              <EmptyState
                title="Sin eventos de este tipo"
                message="Nada oficial ni institucional de esa naturaleza en los próximos 90 días."
              />
            ) : (
              <EmptyState
                title="Sin eventos oficiales"
                message="No hay oficiales ni institucionales que gestionar en los próximos 90 días. Los eventos personales se crean desde la app."
              />
            )
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
  acabandoBorrar,
  onEditar,
  onEliminar,
}: {
  evento: Evento;
  acabandoBorrar: boolean;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={evento.titulo}
      onPress={() => verDetalle(evento)}>
      <View style={filaEnVuelo(acabandoBorrar)}>
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
            {`${FORMATO_FECHA_CORTO_CON_DIA.format(new Date(evento.inicioAt))} · ${
              evento.diaCompleto ? 'Todo el día' : horaRango(evento)
            }`}
          </ThemedText>
          <ThemedText variant="caption" tone="secondary" style={estilos.colAudiencia} numberOfLines={1}>
            {evento.tipo === 'OFICIAL' ? etiquetaAudiencia(evento.decanatoIds) : '—'}
          </ThemedText>
          <Acciones onEditar={onEditar} onEliminar={onEliminar} borrando={acabandoBorrar} />
        </ThemedView>
      </View>
    </Pressable>
  );
}

/** Card móvil: barra de color + título + meta apilada; el detalle edita. */
function TarjetaEvento({
  evento,
  error,
  eliminando,
}: {
  evento: Evento;
  error?: string;
  eliminando?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={evento.titulo}
      onPress={() => verDetalle(evento)}>
      <View style={filaEnVuelo(Boolean(eliminando))}>
        <ThemedView variant="card" style={estilos.tarjeta}>
          <View style={estilos.tarjetaFila}>
            <View style={[estilos.barra, { backgroundColor: colorBarra(evento) }]} />
            <View style={estilos.tarjetaCuerpo}>
              <ThemedText variant="body" weight="semibold" numberOfLines={2}>
                {evento.titulo}
              </ThemedText>
              <ThemedText variant="caption" tone="secondary" numberOfLines={1}>
                {`${ETIQUETA_TIPO[evento.tipo]} · ${FORMATO_FECHA_CORTO_CON_DIA.format(
                  new Date(evento.inicioAt),
                )} · ${evento.diaCompleto ? 'Todo el día' : horaRango(evento)}`}
              </ThemedText>
              {evento.tipo === 'OFICIAL' ? (
                <ThemedText variant="caption" tone="tertiary" numberOfLines={1}>
                  {etiquetaAudiencia(evento.decanatoIds)}
                </ThemedText>
              ) : null}
            </View>
            <CaretRightIcon size={16} color={colors.text.tertiary} />
          </View>
          {error ? <TextoError>{error}</TextoError> : null}
        </ThemedView>
      </View>
    </Pressable>
  );
}

function Acciones({
  onEditar,
  onEliminar,
  borrando,
}: {
  onEditar: () => void;
  onEliminar: () => void;
  borrando?: boolean;
}) {
  return (
    <View style={estilos.acciones}>
      <ThemedButton
        title="Editar"
        variant="secondary"
        size="sm"
        disabled={borrando}
        onPress={onEditar}
      />
      <ThemedButton
        title={borrando ? 'Eliminando…' : 'Eliminar'}
        variant="ghost"
        size="sm"
        loading={borrando}
        onPress={onEliminar}
      />
    </View>
  );
}

/** Cargando marcado por estructura (~cards), no texto plano. */
function EsqueletoEventos({ esDesktop }: { esDesktop: boolean }) {
  return (
    <View style={esDesktop ? estilos.contenidoTabla : estilos.contenido}>
      {(esDesktop ? [0, 1, 2, 3, 4] : [0, 1, 2]).map((f) => (
        <SkeletonCard key={f} />
      ))}
    </View>
  );
}

/** Atenua la fila mientras su eliminación está en vuelo (feedback de la fila). */
function filaEnVuelo(activa: boolean) {
  return activa ? { opacity: 0.55 } : undefined;
}

const estilos = StyleSheet.create({
  pane: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.four,
    paddingTop: spacing.three,
  },
  eyebrow: {
    // Receta eyebrow de la casa: caption + MAYÚSCULAS + tracking 0.8 en
    // gris metadato (la del Panel; inicia el scroll de la sección).
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.text.secondary,
  },
  filaTipos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.four,
    paddingTop: spacing.one,
    gap: spacing.two,
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
  footer: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
