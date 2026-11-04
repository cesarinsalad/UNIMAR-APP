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
  MegaphoneIcon,
} from 'phosphor-react-native';

import { useConteosComunicados } from '@/features/comunicaciones/hooks/useConteosComunicados';
import { useComunicadosFeed } from '@/features/comunicaciones/hooks/useComunicadosFeed';
import {
  etiquetaLecturas,
  puedeVerEstadisticas,
  useEstadisticas,
} from '@/features/comunicaciones/hooks/estadisticas';
import {
  etiquetaParticipantes,
  puedeVerEstadisticasEvento,
  useEstadisticasEvento,
} from '@/features/calendario/hooks/estadisticas-evento';
import { useEventosListado } from '@/features/calendario/hooks/useEventosListado';
import { colorBarra, horaRango } from '@/features/calendario/components/TarjetaProximoEvento';
import { useDecanatos } from '@/features/identidad/hooks/useDecanatos';
import { usePermisos } from '@/features/identidad/hooks/usePermisos';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { FORMATO_FECHA_CORTO_CON_DIA, FORMATO_FECHA_MEDIO } from '@/shared/lib/formatos';
import { aplanarPaginas } from '@/shared/lib/paginar';
import { useRefrescarQueries } from '@/shared/lib/useRefrescarQueries';
import { colors, spacing, useEsDesktop } from '@/shared/ui';
import {
  EmptyState,
  PressableScale,
  SkeletonCard,
  ThemedText,
  ThemedView,
} from '@/shared/ui';
import type { Comunicado, EstadoComunicado } from '@/features/comunicaciones/types';
import type { Evento } from '@/features/calendario/types';

export interface PanelSeccionProps {
  /** Deep-link interno: activa la cola del estado pedido. */
  onIrColas: (estado: EstadoComunicado) => void;
  onIrEventos: () => void;
  /** Crear evento con el formulario propio de la consola (default OFICIAL). */
  onNuevoEvento: () => void;
}

/** Cantidad de previews por monitor (el mando vigila, no lee historial). */
const PREVIEWS_POR_MONITOR = 3;

/**
 * Centro de mando del comunicador: dos monitores espejo (Comunicados /
 * Eventos) sobre una tira de estado del alcance. Cada preview ya trae su
 * stat integrada (lecturas · en agenda — cifras del BFF, nunca dibujadas);
 * la tabla completa vive un tap más abajo. El alcance lo decide RLS en el
 * BFF: el COMUNICADOR solo ve lo de su decanato, el ADMIN lo global.
 */
export function PanelSeccion({ onIrColas, onIrEventos, onNuevoEvento }: PanelSeccionProps) {
  const permisos = usePermisos();
  const esDesktop = useEsDesktop();
  const insets = useSafeAreaInsets();
  const feed = useComunicadosFeed();
  const { eventos: eventosVentana } = useEventosListado();
  const { conteos, error: errorConteos } = useConteosComunicados();
  const { refrescando, refrescar } = useRefrescarQueries();

  function conteo(estado: EstadoComunicado): string {
    if (conteos) return `${conteos[estado]}`;
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
      .filter((e) => new Date(e.inicioAt).getTime() >= ahora)
      .slice(0, PREVIEWS_POR_MONITOR);
  }, [eventosVentana.data]);

  const cargandoComunicados = feed.isPending;
  const cargandoEventos = eventosVentana.isPending;

  return (
    <ThemedView variant="base" style={estilos.pane}>
      <ScrollView
        contentContainerStyle={[estilos.scroll, { paddingBottom: insets.bottom + spacing.eight }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => void refrescar([['comunicados'], ['eventos']])}
            colors={[colors.brand.primary]}
            tintColor={colors.brand.primary}
          />
        }>
        {/* ── Tira de estado: UN documento con 3 celdas, no cards sueltas ── */}
        <TiraEstado
          conteo={conteo}
          onIrColas={onIrColas}
          esAdmin={permisos.esAdmin}
          pendienteLabel={permisos.esAdmin ? 'Por revisar' : 'Esperando'}
          esDesktop={esDesktop}
        />

        {/* ── Monitores espejo: mismo esqueleto, dominios distintos.
            Desktop: lado a lado; móvil: apilados. ── */}
        <View style={[estilos.monitores, esDesktop && estilos.monitoresDesktop]}>
          {/* ── Monitor Comunicados ── */}
          <MonitorContainer
            eyebrow="Últimos comunicados"
            crearLabel="Nuevo comunicado"
            IconoCrear={MegaphoneIcon}
            onCrear={() => router.push('/comunicados/nuevo' as never)}
            monitorEstilo={esDesktop ? estilos.monitorEscritorio : undefined}>
            {cargandoComunicados ? (
              <ListadoSkeleton />
            ) : comunicados.length > 0 ? (
              comunicados.map((comunicado) => (
                <PreviewComunicado key={comunicado.id} comunicado={comunicado} />
              ))
            ) : (
              <EmptyState
                title="Sin comunicados aún"
                message="Publica el primero para tu audiencia."
                style={estilos.vacioMonitor}
              />
            )}
            <PieGestionar
              label="Gestionar comunicados"
              onPress={() => onIrColas('PUBLICADO')}
            />
          </MonitorContainer>

          {/* ── Monitor Eventos ── */}
          <MonitorContainer
            eyebrow="Próximos eventos"
            crearLabel="Nuevo evento"
            IconoCrear={CalendarPlusIcon}
            onCrear={onNuevoEvento}
            monitorEstilo={esDesktop ? estilos.monitorEscritorio : undefined}>
            {cargandoEventos ? (
              <ListadoSkeleton />
            ) : eventos.length > 0 ? (
              eventos.map((evento) => <PreviewEvento key={evento.id} evento={evento} />)
            ) : (
              <EmptyState
                title="Sin eventos próximos"
                message="Crea el próximo evento del decanato."
                style={estilos.vacioMonitor}
              />
            )}
            <PieGestionar label="Gestionar eventos" onPress={onIrEventos} />
          </MonitorContainer>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

/* ── Tira de estado del alcance ──────────────────────────────────────────── */

/** Etiqueta de alcance junto al estado: nombre del decanato (catálogo). */
function AlcanceEtiqueta() {
  const usuario = useSesionStore((s) => s.usuario);
  const permisos = usePermisos();
  const decanatos = useDecanatos();

  if (permisos.esAdmin) return 'Toda la plataforma';

  const nombre = decanatos.data?.find((d) => d.id === usuario?.decanato_id)?.nombre;
  return nombre ?? `Decanato ${usuario?.decanato_id ?? '—'}`;
}

type ConteoFn = (estado: EstadoComunicado) => string;

function TiraEstado({
  conteo,
  onIrColas,
  esAdmin,
  pendienteLabel,
  esDesktop,
}: {
  conteo: ConteoFn;
  onIrColas: (estado: EstadoComunicado) => void;
  esAdmin: boolean;
  pendienteLabel: string;
  esDesktop: boolean;
}) {
  const celdas: { estado: EstadoComunicado; etiqueta: string }[] = [
    { estado: 'PENDIENTE', etiqueta: pendienteLabel },
    { estado: 'BORRADOR', etiqueta: 'Borradores' },
    { estado: 'ARCHIVADO', etiqueta: 'Archivados' },
  ];

  return (
    <ThemedView variant="card" style={estilos.tira}>
      {/* En móvil se apila (el alcance completo cabe); en desktop comparte
          fila: etiqueta a la izquierda, alcance a la derecha. */}
      <View
        style={[
          estilos.tiraCabecera,
          !esDesktop && estilos.tiraCabeceraMovil,
        ]}>
        <ThemedText variant="caption" style={estilos.tiraEtiqueta}>
          {esAdmin ? 'Estado de la plataforma' : 'Estado de tu decanato'}
        </ThemedText>
        <ThemedText variant="caption" tone="secondary" numberOfLines={1} style={estilos.alcance}>
          {`Alcance: ${AlcanceEtiqueta()}`}
        </ThemedText>
      </View>
      <View style={estilos.celdas}>
        {celdas.map((celda, indice) => (
          <Pressable
            key={celda.estado}
            accessibilityRole="button"
            accessibilityLabel={`${celda.etiqueta}: ${conteo(celda.estado)}`}
            onPress={() => onIrColas(celda.estado)}
            style={[estilos.celda, indice > 0 && estilos.celdaDividida]}>
            <ThemedText variant="headline" weight="bold" style={estilos.cifra}>
              {conteo(celda.estado)}
            </ThemedText>
            <ThemedText variant="caption" tone="secondary" numberOfLines={1}>
              {celda.etiqueta}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </ThemedView>
  );
}

/* ── Monitor espejo ──────────────────────────────────────────────────────── */

/**
 * Contenedor del monitor: tarjeta con encabezado (eyebrow de la casa +
 * acción de crear a la derecha), contenido y pie de gestión. El contenido
 * (previews, esqueleto o vacío) lo pone el caller como children.
 */
function MonitorContainer({
  eyebrow,
  crearLabel,
  IconoCrear,
  onCrear,
  monitorEstilo,
  children,
}: {
  eyebrow: string;
  crearLabel: string;
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
          accessibilityLabel={crearLabel}
          hitSlop={spacing.two}
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

/** Pie del monitor: el tap a la tabla completa (target ≥44). */
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

/* ── Previews con stat integrada ─────────────────────────────────────────── */

function PreviewComunicado({ comunicado }: { comunicado: Comunicado }) {
  const usuario = useSesionStore((s) => s.usuario);
  const permiso = puedeVerEstadisticas(
    usuario?.rol ?? null,
    comunicado.autorId === usuario?.id,
    comunicado.decanatoIds,
    usuario?.decanato_id ?? null,
  );
  const stats = useEstadisticas(comunicado.id, permiso);

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
          {stats.data ? (
            <ThemedText variant="caption" weight="semibold" style={estilos.stat}>
              {etiquetaLecturas(stats.data.lecturas)}
            </ThemedText>
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}

function PreviewEvento({ evento }: { evento: Evento }) {
  const usuario = useSesionStore((s) => s.usuario);
  const permiso = puedeVerEstadisticasEvento(
    usuario?.rol ?? null,
    evento.usuarioId === usuario?.id,
    evento.decanatoIds,
    usuario?.decanato_id ?? null,
  );
  const stats = useEstadisticasEvento(evento.id, permiso);

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
          {stats.data ? (
            <ThemedText variant="caption" weight="semibold" style={estilos.stat}>
              {etiquetaParticipantes(stats.data.participantes)}
            </ThemedText>
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}

/** Esqueleto estructural del listado de un monitor. */
function ListadoSkeleton() {
  return (
    <View style={estilos.esqueleto}>
      {[0, 1, 2].map((f) => (
        <SkeletonCard key={f} largo={2} />
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  pane: { flex: 1, backgroundColor: colors.bg.canvas },
  scroll: { padding: spacing.four, gap: spacing.lg },

  /* ── Tira ── */
  tira: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  tiraCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  tiraCabeceraMovil: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: spacing.xs,
  },
  tiraEtiqueta: {
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  alcance: { flexShrink: 1, maxWidth: '60%' },
  // Desktop: la fila es ancha; sin tope el alcance vive a la derecha.
  celdas: { flexDirection: 'row' },
  celda: { flex: 1, alignItems: 'center', minHeight: 44, justifyContent: 'center', gap: 2 },
  celdaDividida: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border.subtle,
  },
  cifra: { color: colors.brand.primary, fontVariant: ['tabular-nums'] },

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
  stat: { color: colors.brand.primary, fontVariant: ['tabular-nums'], flexShrink: 0 },

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
