import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CalendarPlusIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PencilSimpleIcon,
  TrashIcon,
  EyeIcon,
  XIcon,
} from 'phosphor-react-native';

import { eliminarEvento } from '@/features/calendario/api/eventos.api';
import { accionesPermitidasEvento } from '@/features/calendario/hooks/eventos-permisos';
import { useEventosListado } from '@/features/calendario/hooks/useEventosListado';
import { useMutacionEvento } from '@/features/calendario/hooks/useMutacionEvento';
import { colorBarra, horaRango } from '@/features/calendario/components/TarjetaProximoEvento';
import { clasificarEventoVisual } from '@/features/calendario/colores-evento';
import { PALETA_CALENDARIO_UNIMAR } from '@/shared/ui/theme';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { etiquetaAudiencia } from '@/shared/lib/etiquetas';
import { aplanarPaginas } from '@/shared/lib/paginar';
import { FORMATO_FECHA_CORTO_CON_DIA } from '@/shared/lib/formatos';
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue';
import { ApiError } from '@/shared/api/axios';
import { colors, elevation, radius, spacing } from '@/shared/ui';
import {
  Chip,
  EmptyState,
  EstadoCentrado,
  HojaMenuAcciones,
  MenuAcciones,
  ModalConfirmacion,
  SkeletonCard,
  SkeletonGroup,
  TextoError,
  ThemedButton,
  ThemedText,
  ThemedView,
  type AccionGestionItem,
  useEsDesktop,
} from '@/shared/ui';
import type { Evento, TipoEvento } from '@/features/calendario/types';
import { FormularioEvento } from './FormularioEvento';

/** Estado de la sección: lista, creación o edición inline (form propio). */
export type ModoEventos =
  | { vista: 'lista' }
  | { vista: 'crear' }
  | { vista: 'editar'; id: string };

export interface EventosSeccionProps {
  modo: ModoEventos;
  onModo: (modo: ModoEventos) => void;
}

/**
 * Chips de CATEGORÍA OFICIAL del doc (§Vista 3) sobre la taxonomía real del
 * wire: INSTITUCIONAL/FERIADO se recortan server-side (`tipo`); CAMPUS y
 * DECANATO son los OFICIALES separados por audiencia (`decanatoIds` vacío =
 * campus) — server pide tipo=OFICIAL y client refina. `''` = Todas (sin
 * PERSONAL: la consola jamás los gestiona). La máquina de estados NO aplica
 * a eventos (decisión del overhaul): publican al instante, se editan o se
 * eliminan; ni BORRADOR ni aprobación editorial aquí.
 */
type CategoriaSel = '' | 'INSTITUCIONAL' | 'CAMPUS' | 'DECANATO' | 'FERIADO';

const CHIPS_CATEGORIA: { clave: CategoriaSel; etiqueta: string }[] = [
  { clave: '', etiqueta: 'Todas' },
  { clave: 'INSTITUCIONAL', etiqueta: 'Institucional' },
  { clave: 'CAMPUS', etiqueta: 'Campus' },
  { clave: 'DECANATO', etiqueta: 'Decanato' },
  { clave: 'FERIADO', etiqueta: 'Feriado' },
];

function tipoQueryPara(clave: CategoriaSel): TipoEvento | undefined {
  switch (clave) {
    case 'INSTITUCIONAL':
      return 'INSTITUCIONAL';
    case 'FERIADO':
      return 'FERIADO';
    case 'CAMPUS':
    case 'DECANATO':
      return 'OFICIAL';
    default:
      return undefined;
  }
}

/** Estado visual derivado (CAMPUS/DECANATO según audiencia; nombre p/ badge). */
function paletaEvento(evento: Evento) {
  return PALETA_CALENDARIO_UNIMAR[clasificarEventoVisual(evento)];
}

/**
 * Camino B — listado y gestión de eventos (doc §Vista 3, adaptado):
 * ventana de próximos 90 días, búsqueda server-side (título O lugar),
 * chips de categoría con la paleta institucional, tabla desktop / tarjetas
 * móviles. Los PERSONALES no se gestionan aquí (viven en el tab calendario,
 *dueño).
 */
export function EventosSeccion({ modo, onModo }: EventosSeccionProps) {
  const insets = useSafeAreaInsets();
  const esDesktop = useEsDesktop();
  const usuario = useSesionStore((s) => s.usuario);

  const [categoriaSel, setCategoriaSel] = useState<CategoriaSel>('');
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const busqueda = useDebouncedValue(textoBusqueda.trim());

  const { eventos: porVentana, paginar } = useEventosListado({
    tipo: tipoQueryPara(categoriaSel),
    q: busqueda || undefined,
  });

  const gestionables = useMemo(() => {
    if (!porVentana.data) return [];
    let lista = aplanarPaginas(porVentana.data.pages);
    if (categoriaSel === '') {
      // Las 'Todas' de la consola nunca incluyen personales.
      lista = lista.filter((evento) => evento.tipo !== 'PERSONAL');
    }
    if (categoriaSel === 'CAMPUS') {
      lista = lista.filter((evento) => evento.decanatoIds.length === 0);
    }
    if (categoriaSel === 'DECANATO') {
      lista = lista.filter((evento) => evento.decanatoIds.length > 0);
    }
    return lista.filter((evento) =>
      accionesPermitidasEvento({
        rol: usuario?.rol ?? null,
        esDueno: evento.usuarioId === usuario?.id,
        tipo: evento.tipo,
      }).puedeEditar,
    );
  }, [porVentana.data, usuario, categoriaSel]);

  const eliminar = useMutacionEvento((id: string) => eliminarEvento(id));
  const [filaBorrando, setFilaBorrando] = useState<string | null>(null);
  const [erroresFila, setErroresFila] = useState<{ [id: string]: string }>({});
  const [porBorrar, setPorBorrar] = useState<Evento | null>(null);
  const [porAcciones, setPorAcciones] = useState<Evento | null>(null);

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

  function editar(evento: Evento) {
    if (modo.vista === 'lista') {
      onModo({ vista: 'editar', id: evento.id });
    }
  }

  function accionesPara(evento: Evento): AccionGestionItem[] {
    const permitidas = accionesPermitidasEvento({
      rol: usuario?.rol ?? null,
      esDueno: evento.usuarioId === usuario?.id,
      tipo: evento.tipo,
    });
    const lista: AccionGestionItem[] = [
      { clave: 'VER', etiqueta: 'Ver detalle', icono: EyeIcon },
    ];
    if (permitidas.puedeEditar) {
      lista.push({ clave: 'EDITAR', etiqueta: 'Editar', icono: PencilSimpleIcon });
      lista.push({ clave: 'ELIMINAR', etiqueta: 'Eliminar', icono: TrashIcon, destructiva: true });
    }
    return lista;
  }

  function elegirAccion(clave: string, evento: Evento) {
    switch (clave) {
      case 'VER':
        verDetalle(evento);
        break;
      case 'EDITAR':
        editar(evento);
        break;
      case 'ELIMINAR':
        setPorBorrar(evento);
        break;
    }
  }

  function verDetalle(evento: Evento) {
    router.push(`/eventos/${evento.id}` as never);
  }

  function renderItem({ item }: ListRenderItemInfo<Evento>) {
    const errorFila = erroresFila[item.id];
    const borrando = filaBorrando === item.id;
    if (esDesktop) {
      return (
        <FilaTabla
          evento={item}
          borrando={borrando}
          acciones={accionesPara(item)}
          onAbrir={() => verDetalle(item)}
          onElegir={(clave) => elegirAccion(clave, item)}
        />
      );
    }
    return (
      <TarjetaEvento
        evento={item}
        error={errorFila}
        borrando={borrando}
        onAbrir={() => verDetalle(item)}
        onMenu={() => setPorAcciones(item)}
      />
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

  const conFiltros = Boolean(categoriaSel || busqueda);

  return (
    <ThemedView variant="base" style={estilos.pane}>
      {/* Buscador + acción de crear en una fila (el eyebrow lo aporta la
          cabecera del shell; aquí empieza la herramienta). */}
      <View style={estilos.barraSuperior}>
        <View style={estilos.campoBusqueda}>
          <MagnifyingGlassIcon size={18} color={colors.text.secondary} />
          <TextInput
            value={textoBusqueda}
            onChangeText={setTextoBusqueda}
            placeholder="Buscar por título o lugar..."
            placeholderTextColor={colors.text.secondary}
            autoCorrect={false}
            autoComplete="off"
            autoCapitalize="none"
            style={estilos.inputBusqueda}
            accessibilityLabel="Buscar eventos"
          />
          {textoBusqueda.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
              hitSlop={spacing.sm}
              onPress={() => setTextoBusqueda('')}>
              <XIcon size={16} color={colors.text.secondary} />
            </Pressable>
          ) : null}
        </View>
        <ThemedButton
          title="Nuevo evento"
          variant="tonal"
          size="sm"
          icon={<CalendarPlusIcon size={16} color={colors.brand.primary} weight="bold" />}
          onPress={() => onModo({ vista: 'crear' })}
          style={estilos.accionEvento}
        />
      </View>

      {/* Chips de categoría oficial con sus colores institucionales. */}
      <View style={estilos.filaTipos}>
        {CHIPS_CATEGORIA.map((chip) => (
          <Chip
            key={chip.clave}
            etiqueta={chip.etiqueta}
            activa={categoriaSel === chip.clave}
            onPress={() => setCategoriaSel(chip.clave)}
            size="sm"
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
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
          ListEmptyComponent={
            conFiltros ? (
              <EmptyState
                title="Sin eventos con ese filtro"
                message="Ajusta la búsqueda o el filtro de categoría."
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

      {/* Hoja de acciones única (móvil). */}
      {!esDesktop ? (
        <HojaMenuAcciones
          abierto={porAcciones !== null}
          onCerrar={() => setPorAcciones(null)}
          acciones={porAcciones ? accionesPara(porAcciones) : []}
          onElegir={(clave) => {
            const evento = porAcciones;
            setPorAcciones(null);
            if (evento) elegirAccion(clave, evento);
          }}
        />
      ) : null}

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

/** Fila desktop: fila-tranca por naturaleza + menú `⋮` de acciones. */
function FilaTabla({
  evento,
  borrando,
  acciones,
  onAbrir,
  onElegir,
}: {
  evento: Evento;
  borrando: boolean;
  acciones: AccionGestionItem[];
  onAbrir: () => void;
  onElegir: (clave: string) => void;
}) {
  const paleta = paletaEvento(evento);
  return (
    <View>
      <ThemedView variant="card" style={[estilos.filaTabla, borrando && estilos.enVuelo]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Abrir evento: ${evento.titulo}`}
          onPress={onAbrir}
          style={estilos.filaContenido}>
          <View style={[estilos.barra, { backgroundColor: colorBarra(evento) }]} />
          <View style={estilos.colTitulo}>
            <ThemedText variant="bodySm" weight="semibold" numberOfLines={2}>
              {evento.titulo}
            </ThemedText>
            {evento.lugar ? (
              <View style={estilos.filaMeta}>
                <MapPinIcon size={12} color={colors.text.secondary} />
                <ThemedText variant="caption" tone="secondary" numberOfLines={1}>
                  {evento.lugar}
                </ThemedText>
              </View>
            ) : null}
          </View>
          <View style={{ width: 120 }}>
            <BadgeCategoria texto={paleta.nombre} fondo={paleta.bgLight} borde={paleta.border} textoColor={paleta.color} />
          </View>
          <ThemedText variant="caption" tone="secondary" style={{ flex: 1.2 }} numberOfLines={1}>
            {`${FORMATO_FECHA_CORTO_CON_DIA.format(new Date(evento.inicioAt))} · ${
              evento.diaCompleto ? 'Todo el día' : horaRango(evento)
            }`}
          </ThemedText>
          <ThemedText variant="caption" tone="secondary" style={{ width: 130 }} numberOfLines={1}>
            {evento.tipo === 'OFICIAL' ? etiquetaAudiencia(evento.decanatoIds) : '—'}
          </ThemedText>
        </Pressable>
        <View style={estilos.celdaMenu}>
          {!borrando ? (
            <MenuAcciones acciones={acciones} onElegir={onElegir} />
          ) : null}
        </View>
      </ThemedView>
    </View>
  );
}

/** Badge de categoría con la paleta de PALETA_CALENDARIO_UNIMAR (doc §Vista 3). */
function BadgeCategoria({
  texto,
  fondo,
  borde,
  textoColor,
}: {
  texto: string;
  fondo: string;
  borde: string;
  textoColor: string;
}) {
  return (
    <View style={[estilos.badgeCategoria, { backgroundColor: fondo, borderColor: borde }]} >
      <ThemedText variant="caption" weight="medium" numberOfLines={1} style={{ color: textoColor }}>
        {texto}
      </ThemedText>
    </View>
  );
}

/** Card móvil: naturaleza + título + meta (fecha/hora, ubicación, audiencia) + ⋮. */
function TarjetaEvento({
  evento,
  error,
  borrando,
  onAbrir,
  onMenu,
}: {
  evento: Evento;
  error?: string;
  borrando?: boolean;
  onAbrir: () => void;
  onMenu: () => void;
}) {
  const paleta = paletaEvento(evento);
  return (
    <View style={borrando ? estilos.enVuelo : undefined}>
      <ThemedView variant="card" style={estilos.tarjeta}>
        <View style={estilos.tarjetaCabe}>
          <View style={[estilos.barra, { backgroundColor: colorBarra(evento) }]} />
          <BadgeCategoria texto={paleta.nombre} fondo={paleta.bgLight} borde={paleta.border} textoColor={paleta.color} />
          <View style={{ flex: 1 }} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Más acciones"
            hitSlop={spacing.sm}
            onPress={onMenu}>
            <PuntosTres />
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" onPress={onAbrir}>
          <View style={{ gap: 2 }}>
            <ThemedText variant="body" weight="semibold" numberOfLines={2}>
              {evento.titulo}
            </ThemedText>
            <ThemedText variant="caption" tone="secondary" numberOfLines={1}>
              {`${FORMATO_FECHA_CORTO_CON_DIA.format(new Date(evento.inicioAt))} · ${
                evento.diaCompleto ? 'Todo el día' : horaRango(evento)
              }`}
            </ThemedText>
            {evento.lugar ? (
              <View style={estilos.filaMeta}>
                <MapPinIcon size={12} color={colors.text.secondary} />
                <ThemedText variant="caption" tone="secondary" numberOfLines={1}>
                  {evento.lugar}
                </ThemedText>
              </View>
            ) : null}
            {evento.tipo === 'OFICIAL' ? (
              <ThemedText variant="caption" tone="tertiary" numberOfLines={1}>
                {etiquetaAudiencia(evento.decanatoIds)}
              </ThemedText>
            ) : null}
          </View>
        </Pressable>
        {error ? <TextoError>{error}</TextoError> : null}
      </ThemedView>
    </View>
  );
}

/** El `⋮` local de la tarjeta móvil (sin menú: la hoja centraliza). */
function PuntosTres() {
  return (
    <View style={estilos.puntos}>
      <View style={estilos.punto} />
      <View style={estilos.punto} />
      <View style={estilos.punto} />
    </View>
  );
}

/** Cargando marcado por estructura (~cards), no texto plano. */
function EsqueletoEventos({ esDesktop }: { esDesktop: boolean }) {
  return (
    <SkeletonGroup
      label="Cargando lista de eventos"
      style={esDesktop ? estilos.contenidoTabla : estilos.contenido}>
      {(esDesktop ? [0, 1, 2, 3, 4] : [0, 1, 2]).map((f) => (
        <SkeletonCard key={f} />
      ))}
    </SkeletonGroup>
  );
}

const estilos = StyleSheet.create({
  pane: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  barraSuperior: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  accionEvento: {
    backgroundColor: colors.bg.surface,
    ...elevation.sm,
  },
  campoBusqueda: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    paddingLeft: spacing.md,
    height: 44,
    backgroundColor: colors.bg.surface,
  },
  inputBusqueda: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    paddingVertical: 0,
  },
  filaTipos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  contenido: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  contenidoTabla: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  filaTabla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  filaContenido: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  celdaMenu: {
    width: 48,
    alignItems: 'flex-end',
  },
  barra: {
    width: 3,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.primary,
  },
  colTitulo: { flex: 2, gap: 2 },
  filaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeCategoria: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  tarjeta: { gap: spacing.md },
  tarjetaCabe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  puntos: {
    flexDirection: 'row',
    gap: 3,
    padding: spacing.sm,
  },
  punto: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: colors.text.primary,
  },
  enVuelo: { opacity: 0.55 },
  footer: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
