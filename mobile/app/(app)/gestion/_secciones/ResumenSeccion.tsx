import { useMemo } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CalendarPlusIcon,
  CaretRightIcon,
  EyeIcon,
  MegaphoneIcon,
} from 'phosphor-react-native';
import { useConteosComunicados } from '@/features/comunicaciones/hooks/useConteosComunicados';
import { useComunicadosFeed } from '@/features/comunicaciones/hooks/useComunicadosFeed';
import {
  puedeVerEstadisticas,
} from '@/features/comunicaciones/hooks/estadisticas';
import { colorBarra, horaRango } from '@/features/calendario/components/TarjetaProximoEvento';
import { useEventosListado } from '@/features/calendario/hooks/useEventosListado';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { FORMATO_FECHA_CORTO_CON_DIA, FORMATO_FECHA_MEDIO } from '@/shared/lib/formatos';
import { aplanarPaginas } from '@/shared/lib/paginar';
import { useRefrescarQueries } from '@/shared/lib/useRefrescarQueries';
import { colors, spacing, useBreakpoint } from '@/shared/ui';
import {
  EmptyState,
  PressableScale,
  SkeletonCard,
  ThemedButton,
  ThemedText,
  ThemedView,
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

/**
 * Vista 1 del módulo de gestión (doc §Vista 1): acciones rápidas arriba,
 * KPIs en cuadrícula (2×2 móvil / fila de 4 en escritorio), tarjeta del
 * próximo evento oficial y dos monitores espejo con Top 4 + acceso "Ver
 * todos →". El alcance lo decide RLS en el BFF: el COMUNICADOR solo ve lo
 * de su decanato, el ADMIN lo global.
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
  const { conteos, error: errorConteos } = useConteosComunicados();
  const { refrescando, refrescar } = useRefrescarQueries();

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

  const proximoEvento = eventos[0];
  const activasEventos = eventos.length;

  const cargandoComunicados = feed.isPending;
  const cargandoEventos = eventosVentana.isPending;

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

        {/* ── Acciones rápidas (doc: botones destacados de acceso) ── */}
        <View style={estilos.accionesRapidas}>
          <ThemedButton
            title="+ Nuevo comunicado"
            variant="primary"
            size="sm"
            onPress={() => router.push('/comunicados/nuevo' as never)}
            style={estilos.accionPrincipal}
          />
          <ThemedButton
            title="+ Nuevo evento"
            variant="secondary"
            size="sm"
            onPress={onNuevoEvento}
            style={estilos.accionPrincipal}
          />
        </View>

        {/* ── KPIs: UNA cuadrícula 2×2 móvil / fila de 4 desktop ── */}
        <View style={[estilos.kpis, esEscritorio && estilos.kpisDesktop]}>
          <KpiCard
            etiqueta="Por revisar"
            cifra={cifra('PENDIENTE')}
            escritorio={esEscritorio}
            onPress={() => onIrCola('PENDIENTE')}
          />
          <KpiCard
            etiqueta="Borradores"
            cifra={cifra('BORRADOR')}
            escritorio={esEscritorio}
            onPress={() => onIrCola('BORRADOR')}
          />
          <KpiCard
            etiqueta="Publicaciones activas"
            cifra={conteos?.PUBLICADO !== undefined ? `${conteos.PUBLICADO}` : '…'}
            detalle={activasEventos > 0 ? `y ${activasEventos} eventos próximos` : undefined}
            escritorio={esEscritorio}
            onPress={() => onIrCola('PUBLICADO')}
          />
          <KpiCard
            etiqueta="Alcance acumulado"
            cifra={
              conteos?.lecturasTotales !== undefined
                ? `${conteos.lecturasTotales}`
                : errorConteos ? '—' : '…'
            }
            detalle="lecturas confirmadas"
            icono={<EyeIcon size={14} color={colors.brand.primary} weight="bold" />}
            escritorio={esEscritorio}
            onPress={() => onIrCola('PUBLICADO')}
          />
        </View>

        {/* ── Próximo evento oficial (KPI del doc: fecha + título) ── */}
        <ProximoEvento evento={proximoEvento} cargando={cargandoEventos} onIrEventos={onIrEventos} />

        {/* ── Monitores espejo: mismo esqueleto, dominios distintos.
            Desktop: lado a lado; móvil: apilados. ── */}
        <View style={[estilos.monitores, esEscritorio && estilos.monitoresDesktop]}>
          <MonitorContainer
            eyebrow="Últimos comunicados"
            IconoCrear={MegaphoneIcon}
            onCrear={() => router.push('/comunicados/nuevo' as never)}
            monitorEstilo={esEscritorio ? estilos.monitorEscritorio : undefined}>
            {cargandoComunicados ? (
              <ListadoSkeleton />
            ) : comunicados.length > 0 ? (
              comunicados.map((c) => <PreviewComunicado key={c.id} comunicado={c} />)
            ) : (
              <EmptyState
                title="Sin comunicados publicados"
                message="Publica el primero para tu audiencia."
                style={estilos.vacioMonitor}
              />
            )}
            <PieGestionar
              label="Ver todos los comunicados"
              onPress={() => onIrCola('PUBLICADO')}
            />
          </MonitorContainer>

          <MonitorContainer
            eyebrow="Últimos eventos"
            IconoCrear={CalendarPlusIcon}
            onCrear={onNuevoEvento}
            monitorEstilo={esEscritorio ? estilos.monitorEscritorio : undefined}>
            {cargandoEventos ? (
              <ListadoSkeleton />
            ) : eventos.length > 0 ? (
              eventos
                .slice(0, PREVIEWS_POR_MONITOR)
                .map((evento) => <PreviewEvento key={evento.id} evento={evento} />)
            ) : (
              <EmptyState
                title="Sin eventos próximos"
                message="Crea el próximo evento del decanato."
                style={estilos.vacioMonitor}
              />
            )}
            <PieGestionar label="Ver todos los eventos" onPress={onIrEventos} />
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
  escritorio,
  onPress,
}: {
  etiqueta: string;
  cifra: string;
  detalle?: string;
  icono?: React.ReactNode;
  escritorio?: boolean;
  onPress: () => void;
}) {
  return (
    // La RETÍCULA (flex/minWidth) vive en el wrapper, hijo directo del
    // contenedor wrap: los porcentajes se resuelven contra un ancestro ya
    // dimensionado. En la ThemedView interior el % era circular (Yoga lo
    // resolvía raro en device — anomalía reportada por la auditoría).
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${etiqueta}: ${cifra}`}
      onPress={onPress}
      style={[estilos.kpiCelda, escritorio && estilos.kpiCeldaDesktop]}>
      <ThemedView variant="card" style={estilos.kpi}>
        <View style={estilos.kpiPieCabe}>
          <ThemedText variant="headline" weight="bold" style={estilos.kpiCifra}>
            {cifra}
          </ThemedText>
          {icono}
        </View>
        <ThemedText variant="caption" tone="secondary" numberOfLines={1}>
          {etiqueta}
        </ThemedText>
        {detalle ? (
          <ThemedText variant="caption" tone="tertiary" numberOfLines={1} style={estilos.kpiDetalle}>
            {detalle}
          </ThemedText>
        ) : null}
      </ThemedView>
    </PressableScale>
  );
}

/** Tarjeta del próximo evento: fecha+cifra KPI y título; animated tap. */
function ProximoEvento({
  evento,
  cargando,
  onIrEventos,
}: {
  evento: Evento | undefined;
  cargando: boolean;
  onIrEventos: () => void;
}) {
  const contenido =
    cargando ? (
      <SkeletonCard largo={1} />
    ) : !evento ? (
      <ThemedText variant="bodySm" tone="secondary">
        Sin eventos oficiales programados. Crea el próximo con «+ Nuevo evento».
      </ThemedText>
    ) : (
      <View style={estilos.proxContenido}>
        <View style={[estilos.barra, { backgroundColor: colorBarra(evento) }]} />
        <View style={estilos.proxTexto}>
          <ThemedText variant="caption" tone="secondary">
            {`Próximo evento · ${FORMATO_FECHA_CORTO_CON_DIA.format(new Date(evento.inicioAt))} · ${
              evento.diaCompleto ? 'Todo el día' : horaRango(evento)
            }`}
          </ThemedText>
          <ThemedText variant="body" weight="semibold" numberOfLines={1}>
            {evento.titulo}
          </ThemedText>
        </View>
        <CaretRightIcon size={14} color={colors.brand.primary} weight="bold" />
      </View>
    );
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Ir a eventos"
      onPress={onIrEventos}>
      <ThemedView variant="card" style={estilos.prox}>
        {contenido}
      </ThemedView>
    </PressableScale>
  );
}

/* ── Monitor espejo (tarjeta + eyebrow + Crear + contenido + pie) ────────── */

function MonitorContainer({
  eyebrow,
  IconoCrear,
  onCrear,
  monitorEstilo,
  children,
}: {
  eyebrow: string;
  IconoCrear: typeof MegaphoneIcon;
  onCrear: () => void;
  monitorEstilo?: object;
  children: React.ReactNode;
}) {
  return (
    <ThemedView variant="card" style={[estilos.monitor, monitorEstilo]}>
      <View style={estilos.monitorCabecera}>
        <ThemedText variant="caption" style={estilos.eyebrow}>
          {eyebrow}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={eyebrow.replace('Últimos ', 'Crear ')}
          hitSlop={spacing.sm}
          onPress={onCrear}
          style={({ pressed }) => [estilos.accionCrear, pressed && { opacity: 0.7 }]}>
          <IconoCrear size={14} color={colors.brand.primary} weight="bold" />
          <ThemedText variant="caption" weight="semibold" style={estilos.accionCrearTexto}>
            Crear
          </ThemedText>
        </Pressable>
      </View>
      {children}
    </ThemedView>
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

function PreviewComunicado({ comunicado }: { comunicado: Comunicado }) {
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
      accessibilityLabel={`Comunicado: ${comunicado.titulo}`}
      onPress={() => router.push(`/comunicados/${comunicado.id}` as never)}
      style={estilos.fila}>
      <View style={[estilos.barra, { backgroundColor: colors.brand.primary }]} />
      <View style={estilos.filaCuerpo}>
        <ThemedText variant="bodySm" weight="semibold" numberOfLines={2}>
          {comunicado.titulo}
        </ThemedText>
        <View style={estilos.filaMeta}>
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

function PreviewEvento({ evento }: { evento: Evento }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Evento: ${evento.titulo}`}
      onPress={() => router.push(`/eventos/${evento.id}` as never)}
      style={estilos.fila}>
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
function ListadoSkeleton() {
  return (
    <View style={estilos.esqueleto}>
      {[0, 1, 2, 3].map((f) => (
        <SkeletonCard key={f} largo={2} />
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  pane: { flex: 1, backgroundColor: colors.bg.canvas },
  scroll: { padding: spacing.lg, gap: spacing.lg },

  /* ── Acciones rápidas ── */
  accionesRapidas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  accionPrincipal: { flex: 1, minWidth: 180 },

  /* ── KPIs ── */
  kpis: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  kpisDesktop: { flexWrap: 'nowrap' },
  // Retícula del wrapper (hijo del contenedor wrap): el % se resuelve
  // contra el ancho real del contenedor, nunca contra sí mismo.
  kpiCelda: {
    flex: 1,
    minWidth: '45%',
    flexGrow: 1,
  },
  kpiCeldaDesktop: { minWidth: 0, flexGrow: 0 },
  kpi: {
    padding: spacing.lg,
    gap: 2,
  },
  kpiPieCabe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  kpiCifra: {
    color: colors.brand.primary,
    fontVariant: ['tabular-nums'],
  },
  kpiDetalle: { flexShrink: 1 },

  /* ── Próximo evento ── */
  prox: { padding: spacing.lg },
  proxContenido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 44,
  },
  proxTexto: { flex: 1, gap: 2 },

  /* ── Monitores ── */
  monitores: { gap: spacing.lg },
  monitoresDesktop: { flexDirection: 'row' },
  monitorEscritorio: { flex: 1 },
  monitor: { padding: spacing.lg, gap: spacing.md },
  monitorCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  eyebrow: {
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.text.secondary,
  },
  accionCrear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
  },
  accionCrearTexto: { color: colors.brand.primary },

  /* ── Filas de preview ── */
  fila: {
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 44,
  },
  barra: { width: 3, borderRadius: 2 },
  filaCuerpo: { flex: 1, gap: 2 },
  filaMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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
  vacioMonitor: { paddingVertical: spacing.sm },
  esqueleto: { gap: spacing.md },
});
