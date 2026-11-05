import { useEffect, useState } from 'react';
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
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  MegaphoneIcon,
  PaperPlaneTiltIcon,
  PencilSimpleIcon,
  XCircleIcon,
  XIcon,
} from 'phosphor-react-native';

import {
  aprobarComunicado,
  archivarComunicado,
  desarchivarComunicado,
  publicarComunicado,
  rechazarComunicado,
  solicitarRevisionComunicado,
} from '@/features/comunicaciones/api/comunicados.api';
import { ModalRechazo } from '@/features/comunicaciones/components/ModalRechazo';
import { esDevuelto } from '@/features/comunicaciones/helpers';
import { useMisComunicados, totalDeCola } from '@/features/comunicaciones/hooks/useMisComunicados';
import { useTransicionComunicado } from '@/features/comunicaciones/hooks/useMutacionComunicado';
import { accionesPermitidas } from '@/features/comunicaciones/hooks/accionesPermitidas';
import { usePermisos } from '@/features/identidad/hooks/usePermisos';
import { useDecanatos } from '@/features/identidad/hooks/useDecanatos';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { etiquetaAudiencia } from '@/shared/lib/etiquetas';
import { ApiError } from '@/shared/api/axios';
import { aplanarPaginas } from '@/shared/lib/paginar';
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue';
import { FORMATO_FECHA_MEDIO } from '@/shared/lib/formatos';
import { colors, radius, spacing } from '@/shared/ui';
import {
  BadgeEstado,
  Chip,
  EstadoCentrado,
  HojaMenuAcciones,
  MenuAcciones,
  SkeletonCard,
  Select,
  TextoError,
  ThemedButton,
  ThemedText,
  ThemedView,
  type AccionGestionItem,
  type ColumnaTabla,
  useEsDesktop,
} from '@/shared/ui';
import type { Comunicado, EstadoComunicado } from '@/features/comunicaciones/types';

/**
 * Chips de estado del Camino A (doc §Vista 2). `DEVUELTO` es el estado
 * derivado (BORRADOR + motivoRechazo — el BFF no tiene estado RECHAZADO):
 * la query pide BORRADOR y la cola filtra en cliente. '' = Todos.
 */
export type EstadoCola = EstadoComunicado | '' | 'DEVUELTO';

const CHIPS: { clave: EstadoCola; etiqueta: string }[] = [
  { clave: '', etiqueta: 'Todos' },
  { clave: 'BORRADOR', etiqueta: 'Borradores' },
  { clave: 'PENDIENTE', etiqueta: 'En revisión' },
  { clave: 'PUBLICADO', etiqueta: 'Publicados' },
  { clave: 'DEVUELTO', etiqueta: 'Devueltos' },
  { clave: 'ARCHIVADO', etiqueta: 'Archivados' },
];

const CATEGORIAS_COLA: { valor: string; etiqueta: string }[] = [
  { valor: '', etiqueta: 'Todas' },
  { valor: 'ACADEMICO', etiqueta: 'Académico' },
  { valor: 'EVENTO', etiqueta: 'Eventos' },
  { valor: 'INSTITUCIONAL', etiqueta: 'Institucional' },
];

const COLUMNAS: ColumnaTabla[] = [
  { titulo: 'Publicación', flex: 2.2 },
  { titulo: 'Autor', flex: 1 },
  { titulo: 'Dirigido a', flex: 1 },
  { titulo: 'Fecha', width: 100 },
  { titulo: 'Lecturas', width: 104, align: 'right' },
  { titulo: '', width: 48, align: 'right' },
];

export interface ComunicadosSeccionProps {
  /** El estado lo dueña la consola (deep-link ?estado=). */
  estado: EstadoCola;
  onEstado: (estado: EstadoCola) => void;
}

/**
 * Camino A — listado y gestión de comunicados (doc §Vista 2). Filtros
 * server-side (búsqueda q, estado, decanato del ADMIN, categoría) + tablas
 * de escritorio / tarjetas táctiles ( `< 768`), con las acciones por
 * rol×estado del doc: EDITAR, ENVIAR, APROBAR, RECHAZAR (con motivo),
 * PUBLICAR, ARCHIVAR, DESARCHIVAR. Transiciones OPTIMISTAS con la misma
 * mutación del detalle: la fila sale al instante y si el BFF rechaza,
 * vuelve exacta. La RLS decide el alcance.
 */
export function ComunicadosSeccion({ estado, onEstado }: ComunicadosSeccionProps) {
  const insets = useSafeAreaInsets();
  const esDesktop = useEsDesktop();
  const permisos = usePermisos();
  const usuario = useSesionStore((s) => s.usuario);
  const decanatos = useDecanatos();

  const [textoBusqueda, setTextoBusqueda] = useState('');
  const busqueda = useDebouncedValue(textoBusqueda.trim());
  const [categoria, setCategoria] = useState('');
  const [decanatoFiltro, setDecanatoFiltro] = useState<number | null>(null);

  // 'DEVUELTO' baja a BORRADOR en la query y se afina en cliente.
  const estadoQuery: EstadoComunicado | null =
    estado === 'DEVUELTO' ? 'BORRADOR' : estado === '' ? null : estado;
  const soloDevueltos = estado === 'DEVUELTO';

  const query = useMisComunicados(estadoQuery, {
    q: busqueda || undefined,
    categoria: categoria || undefined,
    decanatoId: permisos.esAdmin && decanatoFiltro !== null ? decanatoFiltro : undefined,
  });
  const comunicados = aplanarPaginas(query.data?.pages).filter((c) =>
    soloDevueltos ? esDevuelto(c) : true,
  );
  // Total exacto del BFF (count bajo RLS); para la cola derivada la cuenta
  // la da el filtro cliente (cotas de páginas cargadas, honesto).
  const totalCola = soloDevueltos ? comunicados.length : totalDeCola(query);

  // UNA transición compuesta para las 6 acciones (el detalle usa el mismo
  // patrón): optimistic removal por id + invalidate del prefijo al éxito.
  const transicion = useTransicionComunicado<{ accion: AccionCola; id: string; motivo?: string }>(
    ejecutarTransicion,
  );
  const [filaEnVuelo, setFilaEnVuelo] = useState<string | null>(null);
  const [erroresFila, setErroresFila] = useState<{ [id: string]: string }>({});
  const [porRechazar, setPorRechazar] = useState<Comunicado | null>(null);
  const [errorRechazo, setErrorRechazo] = useState<string | null>(null);
  const [porAcciones, setPorAcciones] = useState<Comunicado | null>(null);

  const ocupado = transicion.isPending;

  useEffect(() => {
    if (porRechazar === null) setErrorRechazo(null);
  }, [porRechazar]);

  function limpiarErrorFila(id: string) {
    setErroresFila((prev) => {
      if (!(id in prev)) return prev;
      const { [id]: _descartado, ...resto } = prev;
      return resto;
    });
  }

  async function ejecutar(accion: AccionCola, c: Comunicado, motivo?: string) {
    limpiarErrorFila(c.id);
    setFilaEnVuelo(c.id);
    try {
      await transicion.mutateAsync({ accion, id: c.id, motivo });
    } catch (e) {
      setErroresFila((prev) => ({
        ...prev,
        [c.id]: e instanceof ApiError ? e.message : 'No se pudo completar. Verifica tu conexión.',
      }));
    } finally {
      setFilaEnVuelo(null);
    }
  }

  /**
   * Rechazo SIN perder el motivo: el modal no se cierra hasta conocer el
   * desenlace (éxito → cierra; fallo → queda abierto con el texto intacto).
   */
  async function confirmarRechazo(motivo: string) {
    const objetivo = porRechazar;
    if (!objetivo) return;
    limpiarErrorFila(objetivo.id);
    setFilaEnVuelo(objetivo.id);
    try {
      await transicion.mutateAsync({ accion: 'RECHAZAR', id: objetivo.id, motivo });
      setPorRechazar(null);
    } catch (e) {
      setErrorRechazo(
        e instanceof ApiError ? e.message : 'No se pudo rechazar. Verifica tu conexión.',
      );
    } finally {
      setFilaEnVuelo(null);
    }
  }

  function accionesPara(c: Comunicado): AccionGestionItem[] {
    const p = accionesPermitidas({
      rol: usuario?.rol ?? null,
      esAutor: c.autorId === usuario?.id,
      estado: c.estado,
    });
    const lista: AccionGestionItem[] = [
      { clave: 'VER', etiqueta: 'Ver detalle', icono: EyeIcon },
    ];
    if (p.puedeEditar) lista.push({ clave: 'EDITAR', etiqueta: 'Editar', icono: PencilSimpleIcon });
    if (p.puedeSolicitarRevision) {
      lista.push({ clave: 'ENVIAR', etiqueta: 'Enviar a revisión', icono: PaperPlaneTiltIcon });
    }
    if (p.puedeAprobar) lista.push({ clave: 'APROBAR', etiqueta: 'Aprobar borrador', icono: CheckCircleIcon });
    if (p.puedeRechazar) lista.push({ clave: 'RECHAZAR', etiqueta: 'Rechazar con motivo', icono: XCircleIcon, destructiva: true });
    if (p.puedePublicar) lista.push({ clave: 'PUBLICAR', etiqueta: 'Publicar borrador', icono: MegaphoneIcon });
    if (p.puedeArchivar) lista.push({ clave: 'ARCHIVAR', etiqueta: 'Archivar', icono: ArchiveIcon });
    if (p.puedeDesarchivar) {
      lista.push({ clave: 'DESARCHIVAR', etiqueta: 'Desarchivar', icono: ArrowCounterClockwiseIcon });
    }
    return lista;
  }

  function elegirAccion(clave: string, c: Comunicado) {
    setPorAcciones(null);
    switch (clave) {
      case 'VER':
        router.navigate(`/comunicados/${c.id}` as never);
        break;
      case 'EDITAR':
        router.push(`/comunicados/nuevo?id=${c.id}` as never);
        break;
      case 'RECHAZAR':
        setPorRechazar(c);
        break;
      default:
        void ejecutar(clave as AccionCola, c);
    }
  }

  function renderItem({ item }: ListRenderItemInfo<Comunicado>) {
    if (esDesktop) {
      return (
        <FilaCola
          comunicado={item}
          acciones={accionesPara(item)}
          ocupado={ocupado}
          enVuelo={filaEnVuelo === item.id}
          error={erroresFila[item.id]}
          onAbrir={() => router.navigate(`/comunicados/${item.id}` as never)}
          onElegir={(clave) => elegirAccion(clave, item)}
        />
      );
    }
    return (
      <TarjetaCola
        comunicado={item}
        onAbrir={() => router.navigate(`/comunicados/${item.id}` as never)}
        onMenu={() => setPorAcciones(item)}
      />
    );
  }

  return (
    <ThemedView variant="base" style={estilos.container}>
      {/* Chips de estado + "N en la cola" compartiendo fila fija. */}
      <View style={estilos.chips}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CHIPS}
          keyExtractor={(chip) => chip.clave}
          renderItem={({ item: chip }) => (
            <Chip
              key={chip.clave}
              etiqueta={chip.etiqueta}
              activa={estado === chip.clave}
              onPress={() => onEstado(chip.clave)}
              size="sm"
            />
          )}
          contentContainerStyle={estilos.chipsFila}
        />
        {!query.isPending && !query.isError ? (
          <ThemedText variant="caption" tone="secondary" style={estilos.totalCola}>
            {`${totalCola} comunicados`}
          </ThemedText>
        ) : null}
      </View>

      {/* Búsqueda server-side (título O cuerpo) + decanato (solo ADMIN). */}
      <View style={estilos.filtros}>
        <View style={estilos.campoBusqueda}>
          <MagnifyingGlassIcon size={18} color={colors.text.secondary} />
          <TextInput
            value={textoBusqueda}
            onChangeText={setTextoBusqueda}
            placeholder="Buscar por título o contenido..."
            placeholderTextColor={colors.text.secondary}
            autoCorrect={false}
            autoComplete="off"
            autoCapitalize="none"
            style={estilos.inputBusqueda}
            accessibilityLabel="Buscar comunicados"
          />
          {textoBusqueda.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
              hitSlop={spacing.sm}
              style={estilos.botonLimpiar}
              onPress={() => setTextoBusqueda('')}>
              <XIcon size={16} color={colors.text.secondary} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <View style={estilos.filaFiltrosAbajo}>
        {permisos.esAdmin ? (
          <View style={estilos.selectDecanato}>
            <Select<number | null>
              valor={decanatoFiltro}
              opciones={[
                { valor: null, etiqueta: 'Todos los decanatos' },
                ...(decanatos.data ?? []).map((d) => ({ valor: d.id, etiqueta: d.nombre })),
              ]}
              onChange={setDecanatoFiltro}
              placeholder="Todos los decanatos"
            />
          </View>
        ) : null}
        <View style={estilos.chipsCategoria}>
          {CATEGORIAS_COLA.map((chip) => (
            <Chip
              key={chip.valor}
              etiqueta={chip.etiqueta}
              activa={categoria === chip.valor}
              onPress={() => setCategoria(chip.valor)}
              size="sm"
            />
          ))}
        </View>
      </View>

      {query.isPending ? (
        <EsqueletoCola esDesktop={esDesktop} />
      ) : query.isError ? (
        <EstadoCentrado gap>
          <TextoError>No se pudo cargar la cola.</TextoError>
          <ThemedButton title="Reintentar" variant="secondary" size="sm" onPress={() => void query.refetch()} />
        </EstadoCentrado>
      ) : (
        <FlatList
          // Desktop También FlatList (la paginación y el esqueleto SON la
          // misma receta): la "tabla" la compone el ListHeader.
          data={comunicados}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            esDesktop ? estilos.contenidoTabla : estilos.contenido,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
          ListHeaderComponent={esDesktop ? (comunicados.length > 0 ? <CabeceraTabla /> : null) : null}
          ListEmptyComponent={
            textoBusqueda || categoria || (decanatoFiltro !== null && permisos.esAdmin) ? (
              <EstadoCentrado>
                <ThemedText variant="bodyLg" weight="semibold">
                  Sin resultados
                </ThemedText>
                <ThemedText tone="secondary">
                  Ajusta la búsqueda o los filtros.
                </ThemedText>
              </EstadoCentrado>
            ) : soloDevueltos ? (
              <EstadoCentrado>
                <ThemedText variant="bodyLg" weight="semibold">
                  Nada devuelto
                </ThemedText>
                <ThemedText tone="secondary">
                  No hay comunicados con observaciones pendientes.
                </ThemedText>
              </EstadoCentrado>
            ) : (
              <EstadoCentrado>
                <ThemedText variant="bodyLg" weight="semibold">
                  Nada aquí
                </ThemedText>
                <ThemedText tone="secondary">
                  No hay comunicados en este estado.
                </ThemedText>
                <ThemedButton
                  title="Crear comunicado"
                  size="sm"
                  onPress={() => router.push('/comunicados/nuevo' as never)}
                />
              </EstadoCentrado>
            )
          }
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <ThemedText variant="caption" tone="tertiary" style={estilos.footer}>
                Cargando más...
              </ThemedText>
            ) : null
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
              colors={[colors.brand.primary]}
              tintColor={colors.brand.primary}
            />
          }
        />
      )}

      {/* Hoja de acciones ÚNICA (móvil): una instancia, filas eligen. */}
      {!esDesktop ? (
        <HojaMenuAcciones
          abierto={porAcciones !== null}
          onCerrar={() => setPorAcciones(null)}
          acciones={porAcciones ? accionesPara(porAcciones) : []}
          onElegir={(clave) => {
            const c = porAcciones;
            setPorAcciones(null);
            if (c) elegirAccion(clave, c);
          }}
        />
      ) : null}

      <ModalRechazo
        visible={porRechazar !== null}
        cargando={filaEnVuelo === porRechazar?.id}
        error={errorRechazo ?? undefined}
        onCancelar={() => setPorRechazar(null)}
        onConfirmar={(motivo) => {
          void confirmarRechazo(motivo);
        }}
      />
    </ThemedView>
  );
}

/** Acciones transicionales del Camino A (la VER no presenta: va al detalle). */
type AccionCola =
  | 'VER'
  | 'EDITAR'
  | 'ENVIAR'
  | 'APROBAR'
  | 'RECHAZAR'
  | 'PUBLICAR'
  | 'ARCHIVAR'
  | 'DESARCHIVAR';

async function ejecutarTransicion(
  id: string,
  motivo: string,
  args: { accion: AccionCola; id: string; motivo?: string },
) {
  switch (args.accion) {
    case 'ENVIAR':
      return solicitarRevisionComunicado(id);
    case 'APROBAR':
      return aprobarComunicado(id);
    case 'RECHAZAR':
      return rechazarComunicado(id, motivo);
    case 'PUBLICAR':
      return publicarComunicado(id);
    case 'ARCHIVAR':
      return archivarComunicado(id);
    case 'DESARCHIVAR':
      return desarchivarComunicado(id);
    default:
      throw new Error(`Acción no transicional: ${args.accion}`);
  }
}

/* ── Tabla de escritorio ───────────────────────────────────────────────────── */

function CabeceraTabla() {
  return (
    <View style={estilos.cabeceraTabla}>
      {COLUMNAS.map((c, indice) => (
        <View
          key={c.titulo || `col-${indice}`}
          style={{
            width: c.width,
            flex: c.width === undefined ? c.flex : undefined,
            justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start',
          }}>
          <ThemedText variant="caption" tone="tertiary">
            {c.titulo}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

/** Fila tabla desktop: columnas + menú `⋮` limpio a la derecha. */
function FilaCola({
  comunicado,
  acciones,
  ocupado,
  enVuelo,
  error,
  onAbrir,
  onElegir,
}: {
  comunicado: Comunicado;
  acciones: AccionGestionItem[];
  ocupado: boolean;
  enVuelo: boolean;
  error?: string;
  onAbrir: () => void;
  onElegir: (clave: string) => void;
}) {
  return (
    <View>
      <Pressable accessibilityRole="button" onPress={onAbrir}>
        <ThemedView variant="card" style={[estilos.filaTabla, enVuelo && estilos.filaEnVuelo]}>
          {/* Publicación: título + badge estado + motivo devuelto */}
          <View style={{ flex: COLUMNAS[0]?.flex ?? 2, gap: 2 }}>
            <ThemedText variant="bodySm" weight="semibold" numberOfLines={2}>
              {comunicado.titulo}
            </ThemedText>
            <BadgeEstado estado={estadoVisual(comunicado)} />
            {esDevuelto(comunicado) ? (
              <ThemedText variant="caption" numberOfLines={1} style={estilos.motivo}>
                Devuelto: {comunicado.motivoRechazo}
              </ThemedText>
            ) : null}
          </View>
          <ThemedText variant="caption" tone="secondary" style={{ flex: 1 }} numberOfLines={1}>
            {comunicado.autorNombre}
          </ThemedText>
          <ThemedText variant="caption" tone="secondary" style={{ flex: 1 }} numberOfLines={1}>
            {etiquetaAudiencia(comunicado.decanatoIds)}
          </ThemedText>
          <ThemedText variant="caption" tone="tertiary" style={{ width: 100 }} numberOfLines={1}>
            {FORMATO_FECHA_MEDIO.format(new Date(comunicado.updatedAt))}
          </ThemedText>
          <ContadorLecturas comunicado={comunicado} />
          <View style={{ width: 48, alignItems: 'flex-end' }}>
            <MenuAcciones acciones={acciones} onElegir={(clave) => {
              if (!ocupado) onElegir(clave);
            }} />
          </View>
        </ThemedView>
      </Pressable>
      {error ? <TextoError>{error}</TextoError> : null}
    </View>
  );
}

/** Contador de lecturas del doc: se dibuja con el EyeIcon de Phosphor,
 *  el lenguaje de iconos única de la app (el glifo 👁 del doc quedaba como
 *  emoji en el dispositivo). */
export function ContadorLecturas({ comunicado }: { comunicado: Comunicado }) {
  const usuario = useSesionStore((s) => s.usuario);
  const visible =
    usuario?.rol === 'ADMIN' || comunicado.autorId === usuario?.id;
  if (!visible) return <View style={{ width: 104 }} />;
  return (
    <View style={estilos.contadorLecturas}>
      <EyeIcon size={12} color={colors.brand.primary} weight="bold" />
      <ThemedText variant="caption" weight="semibold" style={estilos.contadorTexto}>
        {comunicado.lecturasCount ?? 0}
      </ThemedText>
    </View>
  );
}

/** Estado para BadgeEstado (visual derivado, máscara del wire real). */
function estadoVisual(c: Comunicado): 'PUBLICADO' | 'PENDIENTE' | 'DEVUELTO' | 'BORRADOR' | 'ARCHIVADO' {
  if (esDevuelto(c)) return 'DEVUELTO';
  return c.estado;
}

/* ── Tarjeta móvil (doc: Estado+⋮ arriba, título, pie decanato/fecha/punto de lectura) ── */

function TarjetaCola({
  comunicado,
  onAbrir,
  onMenu,
}: {
  comunicado: Comunicado;
  onAbrir: () => void;
  onMenu: () => void;
}) {
  return (
    <ThemedView variant="card" style={{ gap: spacing.md }}>
      <View style={estilos.tarjetaCabe}>
        <BadgeEstado estado={estadoVisual(comunicado)} />
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
            {comunicado.titulo}
          </ThemedText>
          {esDevuelto(comunicado) ? (
            <ThemedText variant="caption" numberOfLines={2} style={estilos.motivo}>
              Devuelto: {comunicado.motivoRechazo}
            </ThemedText>
          ) : null}
        </View>
      </Pressable>
      <View style={estilos.tarjetaPie}>
        <ThemedText variant="caption" tone="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>
          {`${etiquetaAudiencia(comunicado.decanatoIds)} · ${FORMATO_FECHA_MEDIO.format(
            new Date(comunicado.updatedAt),
          )}`}
        </ThemedText>
        <ContadorLecturas comunicado={comunicado} />
      </View>
    </ThemedView>
  );
}

/** El `⋮` local de la tarjeta móvil (sin menú: lo centraliza la hoja). */
function PuntosTres() {
  return (
    <View style={estilos.puntos}>
      <View style={estilos.punto} />
      <View style={estilos.punto} />
      <View style={estilos.punto} />
    </View>
  );
}

/** Cargando marcado por estructura (~cards listado), no texto plano. */
function EsqueletoCola({ esDesktop }: { esDesktop: boolean }) {
  return (
    <View style={esDesktop ? estilos.contenidoTabla : estilos.contenido}>
      {(esDesktop ? [0, 1, 2, 3, 4, 5] : [0, 1, 2]).map((f) => (
        <SkeletonCard key={f} largo={esDesktop ? 3 : 2} />
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  contadorLecturas: {
    width: 104,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  contadorTexto: {
    color: colors.brand.primary,
    fontVariant: ['tabular-nums'],
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  chips: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  chipsFila: { gap: spacing.sm },
  totalCola: {
    fontVariant: ['tabular-nums'],
    marginLeft: 'auto',
    flexShrink: 0,
  },
  filtros: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  campoBusqueda: {
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
  botonLimpiar: { padding: spacing.sm },
  filaFiltrosAbajo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  selectDecanato: { minWidth: 220, maxWidth: 320, flexShrink: 1 },
  chipsCategoria: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    flexShrink: 1,
  },
  contenido: {
    padding: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
  },
  contenidoTabla: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    flexGrow: 1,
  },
  cabeceraTabla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg.canvas,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  filaTabla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  filaEnVuelo: { opacity: 0.55 },
  motivo: { color: colors.status.danger },
  tarjetaCabe: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  tarjetaPie: {
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
  footer: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
