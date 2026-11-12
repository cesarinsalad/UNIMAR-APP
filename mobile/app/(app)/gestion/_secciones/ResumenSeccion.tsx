import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CalendarPlusIcon,
  CaretRightIcon,
  CheckCircleIcon,
  ClipboardTextIcon,
  EyeIcon,
  MegaphoneIcon,
  PencilSimpleIcon,
} from 'phosphor-react-native';
import type { LecturaReciente } from '@/features/comunicaciones/api/comunicados.api';
import { useConteosComunicados } from '@/features/comunicaciones/hooks/useConteosComunicados';
import { useComunicadosFeed } from '@/features/comunicaciones/hooks/useComunicadosFeed';
import {
  puedeVerEstadisticas,
} from '@/features/comunicaciones/hooks/estadisticas';
import { colorBarra, horaRango } from '@/features/calendario/components/TarjetaProximoEvento';
import { useEventosListado } from '@/features/calendario/hooks/useEventosListado';
import { useDecanatos } from '@/features/identidad/hooks/useDecanatos';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { FORMATO_FECHA_CORTO_CON_DIA, FORMATO_FECHA_MEDIO } from '@/shared/lib/formatos';
import { aplanarPaginas } from '@/shared/lib/paginar';
import { useRefrescarQueries } from '@/shared/lib/useRefrescarQueries';
import { colors, elevation, radius, spacing, useBreakpoint } from '@/shared/ui';
import {
  Badge,
  Card,
  EmptyState,
  PressableScale,
  Skeleton,
  SkeletonGroup,
  ThemedButton,
  ThemedText,
  ThemedView,
  TextoError,
} from '@/shared/ui';
import type { Comunicado, EstadoComunicado } from '@/features/comunicaciones/types';
import type { Evento } from '@/features/calendario/types';

export interface ResumenSeccionProps {
  /** Saltar a una cola concreta del Camino A (KPIs tapPor). */
  onIrCola: (estado: EstadoComunicado) => void;
  onIrEventos: () => void;
  /** Crear evento con el formulario propio de la consola (inline). */
  onNuevoEvento: () => void;
}

/** Cantidad de previews por monitor (el mando vigila, no lee historial). */
const PREVIEWS_POR_MONITOR = 4;

function formatearPorcentaje(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return '—';
  return `${valor.toFixed(1).replace('.', ',')}%`;
}

/** Etiqueta compacta para la pill de audiencia del monitor. */
function etiquetaAudienciaCorta(
  decanatoIds: number[],
  nombres: ReadonlyMap<number, string>,
): string {
  if (decanatoIds.length === 0) return 'Toda la universidad';
  if (decanatoIds.length > 1) return `${decanatoIds.length} decanatos`;
  const id = decanatoIds[0];
  if (id === undefined) return 'Toda la universidad';
  const nombre = nombres.get(id);
  return nombre && nombre.length <= 24 ? nombre : `Decanato ${id}`;
}

/**
 * Vista 1 del módulo de gestión (doc §Vista 1): acciones rápidas arriba,
 * tres KPIs, diagnóstico de alcance con barras y dos monitores espejo con
 * Top 4 + acceso "Ver todos →". El alcance lo decide RLS en el BFF: el
 * COMUNICADOR solo ve lo de su decanato, el ADMIN lo global.
 */
export function ResumenSeccion({
  onIrCola,
  onIrEventos,
  onNuevoEvento,
}: ResumenSeccionProps) {
  const esEscritorio = useBreakpoint() === 'escritorio';
  const insets = useSafeAreaInsets();
  const feed = useComunicadosFeed();
  const { eventos: eventosVentana } = useEventosListado();
  const { conteos, error: errorConteos, refetch: refetchConteos } = useConteosComunicados();
  const decanatos = useDecanatos();
  const { refrescando, refrescar } = useRefrescarQueries();

  const nombresDecanatos = useMemo(
    () => new Map((decanatos.data ?? []).map((d) => [d.id, d.nombre])),
    [decanatos.data],
  );

  function cifra(estado: EstadoComunicado): string {
    if (conteos) return `${conteos[estado] ?? 0}`;
    return errorConteos ? '—' : '…';
  }

  const comunicados = useMemo(
    () => (feed.data ? aplanarPaginas(feed.data.pages).slice(0, PREVIEWS_POR_MONITOR) : []),
    [feed.data],
  );

  const eventos = useMemo(() => {
    if (!eventosVentana.data) return [];
    const ahora = Date.now();
    return aplanarPaginas(eventosVentana.data.pages)
      .filter((e) => e.tipo !== 'PERSONAL')
      .filter((e) => new Date(e.inicioAt).getTime() >= ahora);
  }, [eventosVentana.data]);

  const cargandoComunicados = feed.isPending;
  const cargandoEventos = eventosVentana.isPending;
  // Un refetch fallido con datos previos no debe borrar la información
  // disponible; el error de carga completa sí reemplaza el estado vacío.
  const errorComunicados = feed.isError && !feed.data;
  const errorEventos = eventosVentana.isError && !eventosVentana.data;
  const sinConteos = Boolean(errorConteos) && !conteos;
  const hayPendientes = (conteos?.PENDIENTE ?? 0) > 0;
  const tasaLectura = conteos?.tasaLecturaPromedio30d;
  const cifraTasa = sinConteos ? '—' : !conteos ? '…' : formatearPorcentaje(tasaLectura);

  function detalleKpi(valor: number | undefined, cero: string, positivo: string): string {
    if (sinConteos) return 'No disponible';
    return valor === 0 ? cero : positivo;
  }

  const kpiPendientes = (
    <KpiCard
      etiqueta="Por revisar"
      cifra={cifra('PENDIENTE')}
      detalle={detalleKpi(conteos?.PENDIENTE, 'Nada pendiente', 'Pendientes de aprobación')}
      indicadorAcento={hayPendientes}
      icono={
        conteos?.PENDIENTE === 0 ? (
          <CheckCircleIcon size={16} color={colors.status.success} weight="bold" />
        ) : (
          <ClipboardTextIcon size={16} color={colors.brand.primary} weight="bold" />
        )
      }
      onPress={() => onIrCola('PENDIENTE')}
    />
  );

  const kpiBorradores = (
    <KpiCard
      etiqueta="Borradores"
      cifra={cifra('BORRADOR')}
      detalle={detalleKpi(conteos?.BORRADOR, 'Nada en redacción', 'En redacción')}
      icono={<PencilSimpleIcon size={16} color={colors.brand.primary} weight="bold" />}
      onPress={() => onIrCola('BORRADOR')}
    />
  );

  const kpiTasa = (
    <KpiCard
      etiqueta="Tasa de lectura"
      cifra={cifraTasa}
      detalle="Tasa promedio de lectura en los últimos 30 días"
      icono={<EyeIcon size={16} color={colors.brand.primary} weight="bold" />}
    />
  );

  return (
    <ThemedView variant="base" style={estilos.pane}>
      <ScrollView
        contentContainerStyle={[estilos.scroll, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => void refrescar([['comunicados'], ['eventos']])}
            colors={[colors.brand.primary]}
            tintColor={colors.brand.primary}
          />
        }>

        {/* ── Acciones de la vista, sin título redundante con la navegación ── */}
        <View style={estilos.cabeceraResumen}>
          <View style={estilos.accionesRapidas}>
            <ThemedButton
              title="Nuevo comunicado"
              variant="primary"
              size="sm"
              icon={<MegaphoneIcon size={16} color={colors.text.onPrimary} weight="bold" />}
              onPress={() => router.push('/comunicados/nuevo' as never)}
              style={estilos.accionComunicado}
            />
            <ThemedButton
              title="Nuevo evento"
              variant="tonal"
              size="sm"
              icon={<CalendarPlusIcon size={16} color={colors.brand.primary} weight="bold" />}
              onPress={onNuevoEvento}
              style={estilos.accionEvento}
            />
          </View>
        </View>

        {/* ── KPIs: 3 columnas desktop; 2 + tasa a ancho completo en móvil. ── */}
        <View style={[estilos.kpis, esEscritorio && estilos.kpisDesktop]}>
          {esEscritorio ? (
            <>
              {kpiPendientes}
              {kpiBorradores}
              {kpiTasa}
            </>
          ) : (
            <>
              <View style={estilos.kpiFila}>
                {kpiPendientes}
                {kpiBorradores}
              </View>
              <View style={estilos.kpiFila}>{kpiTasa}</View>
            </>
          )}
        </View>

        {/* ── Diagnóstico de alcance: barras comparables, sin librerías. ── */}
        <AlcanceReciente
          recientes={conteos?.recientes ?? []}
          cargando={!conteos && !sinConteos}
          error={sinConteos}
          onReintentar={refetchConteos}
        />

        {/* ── Monitores espejo: mismo esqueleto, dominios distintos.
            Desktop: lado a lado; móvil: apilados. ── */}
        <View style={[estilos.monitores, esEscritorio && estilos.monitoresDesktop]}>
          <MonitorContainer
            eyebrow="Últimos comunicados"
            monitorEstilo={esEscritorio ? estilos.monitorEscritorio : undefined}
            pie={
              <PieGestionar
                label="Ver todos los comunicados"
                onPress={() => onIrCola('PUBLICADO')}
              />
            }>
            {cargandoComunicados ? (
              <ListadoSkeleton label="Cargando comunicados" />
            ) : errorComunicados ? (
              <ErrorMonitor
                mensaje="No se pudieron cargar los comunicados."
                onReintentar={() => void feed.refetch()}
              />
            ) : comunicados.length > 0 ? (
              comunicados.map((c, indice) => (
                <PreviewComunicado
                  key={c.id}
                  comunicado={c}
                  audiencia={etiquetaAudienciaCorta(c.decanatoIds, nombresDecanatos)}
                  conSeparador={indice > 0}
                />
              ))
            ) : (
              <EmptyState
                title="Sin comunicados publicados"
                message="Publica el primero para tu audiencia."
                style={estilos.vacioMonitor}
              />
            )}
          </MonitorContainer>

          <MonitorContainer
            eyebrow="Próximos eventos"
            monitorEstilo={esEscritorio ? estilos.monitorEscritorio : undefined}
            pie={<PieGestionar label="Ver todos los eventos" onPress={onIrEventos} />}>
            {cargandoEventos ? (
              <ListadoSkeleton label="Cargando eventos" />
            ) : errorEventos ? (
              <ErrorMonitor
                mensaje="No se pudieron cargar los eventos."
                onReintentar={() => void eventosVentana.refetch()}
              />
            ) : eventos.length > 0 ? (
              eventos
                .slice(0, PREVIEWS_POR_MONITOR)
                .map((evento, indice) => (
                  <PreviewEvento key={evento.id} evento={evento} conSeparador={indice > 0} />
                ))
            ) : (
              <EmptyState
                title="Sin eventos próximos"
                message="Crea el próximo evento del decanato."
                style={estilos.vacioMonitor}
              />
            )}
          </MonitorContainer>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

/* ── Tarjetas KPI ─────────────────────────────────────────────────────────── */

function KpiCard({
  etiqueta,
  cifra,
  detalle,
  icono,
  indicadorAcento = false,
  onPress,
}: {
  etiqueta: string;
  cifra: string;
  detalle?: string;
  icono?: React.ReactNode;
  /** Punto naranja de atención; nunca se aplica al texto (STYLE.md §1.3). */
  indicadorAcento?: boolean;
  /** Sin destino exacto, el KPI es informativo (no se anuncia como botón). */
  onPress?: () => void;
}) {
  const etiquetaAccesible = `${etiqueta}: ${cifra}${detalle ? `, ${detalle}` : ''}`;
  const contenido = (
    <Card paddingV="md" style={estilos.kpi}>
      <View style={estilos.kpiCabecera}>
        <ThemedText
          variant="body"
          weight="semibold"
          numberOfLines={2}
          style={estilos.kpiEtiqueta}>
          {etiqueta}
        </ThemedText>
        {icono}
      </View>
      <View style={estilos.kpiCifraFila}>
        <ThemedText variant="headline" weight="bold" style={estilos.kpiCifra}>
          {cifra}
        </ThemedText>
        {indicadorAcento ? (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={estilos.kpiPuntoAcento}
          />
        ) : null}
      </View>
      {detalle ? (
        <View style={estilos.kpiDetalleFila}>
          <ThemedText
            variant="caption"
            tone="secondary"
            numberOfLines={2}
            style={estilos.kpiDetalle}>
            {detalle}
          </ThemedText>
          {onPress ? (
            <CaretRightIcon size={14} color={colors.brand.primary} weight="bold" />
          ) : null}
        </View>
      ) : null}
    </Card>
  );

  return (
    // La celda reparte el ancho de su fila con `flex: 1`; sin porcentajes
    // anidados ni flexWrap, que colapsaban las tarjetas en escritorio.
    <View style={estilos.kpiCelda}>
      {onPress ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={etiquetaAccesible}
          onPress={onPress}>
          {contenido}
        </PressableScale>
      ) : (
        <View accessible accessibilityLabel={etiquetaAccesible}>{contenido}</View>
      )}
    </View>
  );
}

/* ── Alcance reciente (barras comparativas) ─────────────────────────────── */

function AlcanceReciente({
  recientes,
  cargando,
  error,
  onReintentar,
}: {
  recientes: LecturaReciente[];
  cargando: boolean;
  error: boolean;
  onReintentar: () => void;
}) {
  return (
    <Card style={estilos.alcance}>
      <View style={estilos.alcanceCabecera}>
        <ThemedText variant="subtitle" weight="semibold">
          Alcance por comunicado reciente
        </ThemedText>
        <ThemedText variant="caption" tone="secondary">
          Lecturas confirmadas / estudiantes objetivo en la app
        </ThemedText>
      </View>

      {cargando ? (
        <SkeletonGroup label="Cargando alcance por comunicado" style={estilos.alcanceEsqueleto}>
          {[0, 1, 2, 3].map((fila) => (
            <View key={fila} style={estilos.alcanceEsqueletoFila}>
              <Skeleton style={estilos.alcanceEsqueletoTitulo} />
              <View style={estilos.alcanceEsqueletoBarra}>
                <Skeleton style={estilos.alcanceEsqueletoFill} />
              </View>
            </View>
          ))}
        </SkeletonGroup>
      ) : error ? (
        <View style={estilos.alcanceError}>
          <TextoError>No se pudo cargar el alcance de los comunicados.</TextoError>
          <ThemedButton
            title="Reintentar"
            variant="secondary"
            size="sm"
            onPress={onReintentar}
          />
        </View>
      ) : recientes.length === 0 ? (
        <ThemedText variant="bodySm" tone="secondary">
          Aún no hay publicaciones en los últimos 30 días.
        </ThemedText>
      ) : (
        <View style={estilos.alcanceFilas}>
          {recientes.map((item, indice) => (
            <FilaAlcance
              key={item.id}
              item={item}
              conSeparador={indice > 0}
            />
          ))}
        </View>
      )}
    </Card>
  );
}

function FilaAlcance({
  item,
  conSeparador,
}: {
  item: LecturaReciente;
  conSeparador: boolean;
}) {
  const porcentaje = item.tasa ?? 0;
  const porcentajeTexto = formatearPorcentaje(item.tasa);
  const etiqueta =
    item.audiencia > 0
      ? `${item.titulo}: ${item.lecturas} de ${item.audiencia} estudiantes, ${porcentajeTexto} de lectura`
      : `${item.titulo}: sin audiencia objetivo`;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={etiqueta}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(porcentaje) }}
      style={[estilos.alcanceFila, conSeparador && estilos.alcanceFilaSeparada]}>
      <View style={estilos.alcanceFilaCabecera}>
        <ThemedText
          variant="bodySm"
          weight="semibold"
          numberOfLines={1}
          style={estilos.alcanceTitulo}>
          {item.titulo}
        </ThemedText>
        <ThemedText variant="caption" tone="secondary" style={estilos.alcanceMeta}>
          {`${item.lecturas} / ${item.audiencia} estudiantes`}
        </ThemedText>
        <ThemedText variant="caption" weight="semibold" style={estilos.alcancePct}>
          {porcentajeTexto}
        </ThemedText>
      </View>
      <View style={estilos.alcanceBarraTrack}>
        <View
          style={[
            estilos.alcanceBarraFill,
            { width: `${Math.max(0, Math.min(100, porcentaje))}%` },
          ]}
        />
      </View>
    </View>
  );
}

/* ── Monitor espejo (tarjeta + título + contenido + pie) ────────────────── */

function MonitorContainer({
  eyebrow,
  monitorEstilo,
  pie,
  children,
}: {
  eyebrow: string;
  monitorEstilo?: { flex?: number };
  pie: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card style={[estilos.monitor, monitorEstilo]}>
      <ThemedText variant="body" weight="semibold" style={estilos.eyebrow}>
        {eyebrow}
      </ThemedText>
      <View style={estilos.monitorCuerpo}>{children}</View>
      {pie}
    </Card>
  );
}

function ErrorMonitor({
  mensaje,
  onReintentar,
}: {
  mensaje: string;
  onReintentar: () => void;
}) {
  return (
    <View style={estilos.errorMonitor}>
      <TextoError>{mensaje}</TextoError>
      <ThemedButton
        title="Reintentar"
        variant="secondary"
        size="sm"
        onPress={onReintentar}
      />
    </View>
  );
}

/** Pie del monitor: el "Ver todos →" del doc (target ≥44). */
function PieGestionar({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={estilos.pieFila}>
      <ThemedText variant="bodySm" weight="semibold" style={estilos.pieTexto}>
        {label}
      </ThemedText>
      <CaretRightIcon size={14} color={colors.brand.primary} weight="bold" />
    </PressableScale>
  );
}

/* ── Previews con stat integrada (lecturas del wire, sin llamadas por-ítem) ── */

function PreviewComunicado({
  comunicado,
  audiencia,
  conSeparador = false,
}: {
  comunicado: Comunicado;
  audiencia: string;
  conSeparador?: boolean;
}) {
  const usuario = useSesionStore((s) => s.usuario);
  const permiso = puedeVerEstadisticas(
    usuario?.rol ?? null,
    comunicado.autorId === usuario?.id,
    comunicado.decanatoIds,
    usuario?.decanato_id ?? null,
  );

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Comunicado: ${comunicado.titulo}. Audiencia: ${audiencia}`}
      onPress={() => router.push(`/comunicados/${comunicado.id}` as never)}
      style={[estilos.fila, conSeparador && estilos.filaSeparada]}>
      <View style={[estilos.barra, { backgroundColor: colors.brand.primary }]} />
      <View style={estilos.filaCuerpo}>
        <ThemedText variant="bodySm" weight="semibold" numberOfLines={2}>
          {comunicado.titulo}
        </ThemedText>
        <View style={estilos.filaMeta}>
          <Badge label={audiencia} />
          <ThemedText variant="caption" tone="secondary" numberOfLines={1} style={estilos.meta}>
            {FORMATO_FECHA_MEDIO.format(new Date(comunicado.publicadoAt ?? comunicado.updatedAt))}
          </ThemedText>
          {permiso && comunicado.lecturasCount !== undefined ? (
            <View style={estilos.stat}>
              <EyeIcon size={12} color={colors.brand.primary} weight="bold" />
              <ThemedText variant="caption" weight="semibold" style={estilos.statCifra}>
                {comunicado.lecturasCount}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}

function PreviewEvento({
  evento,
  conSeparador = false,
}: {
  evento: Evento;
  conSeparador?: boolean;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Evento: ${evento.titulo}`}
      onPress={() => router.push(`/eventos/${evento.id}` as never)}
      style={[estilos.fila, conSeparador && estilos.filaSeparada]}>
      <View style={[estilos.barra, { backgroundColor: colorBarra(evento) }]} />
      <View style={estilos.filaCuerpo}>
        <ThemedText variant="bodySm" weight="semibold" numberOfLines={2}>
          {evento.titulo}
        </ThemedText>
        <View style={estilos.filaMeta}>
          <ThemedText variant="caption" tone="secondary" numberOfLines={1} style={estilos.meta}>
            {`${FORMATO_FECHA_CORTO_CON_DIA.format(new Date(evento.inicioAt))} · ${
              evento.diaCompleto ? 'Todo el día' : horaRango(evento)
            }`}
          </ThemedText>
        </View>
      </View>
    </PressableScale>
  );
}

/** Esqueleto estructural del listado de un monitor. */
function ListadoSkeleton({ label }: { label: string }) {
  return (
    <SkeletonGroup label={label} style={estilos.esqueleto}>
      {[0, 1, 2, 3].map((fila) => (
        <View
          key={fila}
          style={[estilos.esqueletoFila, fila > 0 && estilos.esqueletoFilaSeparada]}>
          <Skeleton redondo style={estilos.esqueletoBarra} />
          <View style={estilos.esqueletoCuerpo}>
            <Skeleton style={estilos.esqueletoTitulo} />
            <Skeleton style={estilos.esqueletoMeta} />
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );
}

const estilos = StyleSheet.create({
  pane: { flex: 1, backgroundColor: colors.bg.canvas },
  scroll: { padding: spacing.lg, gap: spacing.lg },

  /* ── Cabecera de la vista ── */
  cabeceraResumen: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  accionesRapidas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  accionComunicado: {
    borderWidth: 0,
    ...elevation.md,
  },
  accionEvento: {
    backgroundColor: colors.bg.surface,
    ...elevation.sm,
  },

  /* ── KPIs ── */
  kpis: { gap: spacing.md },
  kpisDesktop: { flexDirection: 'row' },
  kpiFila: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  kpiCelda: {
    flex: 1,
    minWidth: 0,
  },
  kpi: {
    flexGrow: 1,
    gap: spacing.xs,
  },
  kpiCabecera: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  kpiEtiqueta: {
    flex: 1,
  },
  kpiCifraFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  kpiCifra: {
    color: colors.brand.primary,
    fontVariant: ['tabular-nums'],
  },
  kpiPuntoAcento: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.accent.urgent,
  },
  kpiDetalleFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  kpiDetalle: { flex: 1 },
  /* ── Alcance reciente ── */
  alcance: { gap: spacing.lg },
  alcanceCabecera: { gap: spacing.xs },
  alcanceFilas: { gap: spacing.md },
  alcanceFila: { gap: spacing.sm },
  alcanceFilaSeparada: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
    paddingTop: spacing.md,
  },
  alcanceFilaCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  alcanceTitulo: {
    flex: 1,
    minWidth: 0,
  },
  alcanceMeta: { flexShrink: 0 },
  alcancePct: {
    minWidth: 44,
    textAlign: 'right',
    color: colors.brand.primary,
    fontVariant: ['tabular-nums'],
  },
  alcanceBarraTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.surfaceBlue,
    overflow: 'hidden',
  },
  alcanceBarraFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.brand.primary,
  },
  alcanceError: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  alcanceEsqueleto: { gap: spacing.md },
  alcanceEsqueletoFila: { gap: spacing.sm },
  alcanceEsqueletoTitulo: { width: '55%' },
  alcanceEsqueletoBarra: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.bg.sunken,
    overflow: 'hidden',
  },
  alcanceEsqueletoFill: {
    width: '55%',
    height: 8,
    borderRadius: radius.pill,
  },

  /* ── Monitores ── */
  monitores: { gap: spacing.lg },
  monitoresDesktop: { flexDirection: 'row' },
  monitorEscritorio: { flex: 1, minWidth: 0 },
  monitor: { gap: spacing.md },
  monitorCuerpo: { flex: 1, gap: spacing.md },
  eyebrow: {
    letterSpacing: 0.2,
    color: colors.text.primary,
  },

  /* ── Filas de preview ── */
  fila: {
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 44,
  },
  filaSeparada: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
    paddingTop: spacing.md,
  },
  barra: { width: 3, borderRadius: 2 },
  filaCuerpo: { flex: 1, gap: 2 },
  filaMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  meta: { flexShrink: 1 },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
  statCifra: { color: colors.brand.primary, fontVariant: ['tabular-nums'] },

  pieFila: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  pieTexto: { color: colors.brand.primary },
  vacioMonitor: {
    minHeight: 120,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  errorMonitor: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  esqueleto: { gap: spacing.md },
  esqueletoFila: {
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 44,
  },
  esqueletoFilaSeparada: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
    paddingTop: spacing.md,
  },
  esqueletoBarra: { width: 3, height: 32 },
  esqueletoCuerpo: { flex: 1, gap: spacing.sm },
  esqueletoTitulo: { width: '72%', height: 18 },
  esqueletoMeta: { width: '45%', height: 14 },
});
