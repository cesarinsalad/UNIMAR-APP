import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeftIcon, MapPinIcon, ClockIcon } from 'phosphor-react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion as useReanimatedReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { eliminarEvento } from '@/features/calendario/api/eventos.api';
import { etiquetaAudiencia } from '@/shared/lib/etiquetas';
import { accionesPermitidasEvento } from '@/features/calendario/hooks/eventos-permisos';
import { useEventoDetalle } from '@/features/calendario/hooks/useEventoDetalle';
import { useMutacionEvento } from '@/features/calendario/hooks/useMutacionEvento';
import { useParticipacion } from '@/features/calendario/hooks/useParticipacion';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import type { Evento } from '@/features/calendario/types';
import { colorBarra, horaRango } from '@/features/calendario/components/TarjetaProximoEvento';
import { ApiError } from '@/shared/api/axios';
import { colors, elevation, highlight, radius, spacing } from '@/shared/ui';
import {
  BotonCircular,
  SectionHeader,
  ThemedButton,
  ThemedText,
  ThemedView,
} from '@/shared/ui';

/** Altura del BotonCircular (40) + respiro (sm) entre él y el documento. */
const ESPACIO_PARA_VOLVER = 40 + spacing.sm;

/**
 * Detalle de evento como DOCUMENTO ("El Registro Institucional"): el card
 * unificado del sistema "se expande" a una sola superficie blanca que
 * cubre la pantalla y contiene todo — el contenido del card vive como
 * header del documento (día grande + barra de color + título + hora +
 * lugar) y las secciones (descripción, organizador, CTA, acciones staff)
 * dentro. El botón Volver flota JUSTO ENCIMA del documento (fuera de su
 * borde superior, sin "atravesarlo"), y el safe-area inferior se respeta
 * para no quedar bajo la barra de control de Android. Entrada con
 * expansión sutil (scale 0.96→1 + fade, solo fade con motion reducido).
 * Sin asistentes/RSVP (fuera de alcance de la tesis) ni acciones fantasma.
 */
export default function EventoDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useEventoDetalle(id);
  const insets = useSafeAreaInsets();

  return (
    <ThemedView variant="base" style={estilos.container}>
      {query.isPending ? (
        <Centrado>
          <ActivityIndicator color={colors.brand.primary} />
        </Centrado>
      ) : query.isError ? (
        <Centrado gap>
          <ThemedText variant="subtitle" weight="semibold">
            {query.error instanceof ApiError && query.error.status === 404
              ? 'Este evento ya no está disponible.'
              : 'No se pudo cargar el evento.'}
          </ThemedText>
        </Centrado>
      ) : query.data ? (
        <Documento evento={query.data} eventoId={id} insets={insets} />
      ) : null}
      <BotonCircular
        label="Volver"
        onPress={() => router.back()}
        style={[estilos.backFlotante, { top: insets.top + spacing.sm }]}>
        <ArrowLeftIcon size={20} color={colors.brand.primary} weight="bold" />
      </BotonCircular>
    </ThemedView>
  );
}

/** Entrada "expansión" del documento: scale 0.96→1 + fade en 180 ms;
 *  con motion reducido del sistema, solo fade. */
function useAnimacionEntrada() {
  const reducido = useReanimatedReducedMotion();
  const escala = useSharedValue(0.96);
  const opacidad = useSharedValue(0);

  useEffect(() => {
    opacidad.value = withTiming(1, { duration: reducido ? 0 : 180 });
    escala.value = withTiming(1, { duration: reducido ? 0 : 180 });
  }, [escala, opacidad, reducido]);

  return useAnimatedStyle(() => ({
    opacity: opacidad.value,
    transform: [{ scale: escala.value }],
  }));
}

function Documento({
  evento,
  eventoId,
  insets,
}: {
  evento: Evento;
  eventoId: string;
  insets: { top: number; bottom: number };
}) {
  const animEntrada = useAnimacionEntrada();
  const inicio = new Date(evento.inicioAt);
  const usuario = useSesionStore((s) => s.usuario);
  const acciones = accionesPermitidasEvento({
    rol: usuario?.rol ?? null,
    esDueno: evento.usuarioId === usuario?.id,
    tipo: evento.tipo,
  });
  const hayAcciones = acciones.puedeEditar || acciones.puedeEliminar;

  const eliminar = useMutacionEvento(() => eliminarEvento(eventoId));
  const participar = useParticipacion();
  const [errorMutacion, setErrorMutacion] = useState<string | null>(null);

  function confirmarEliminacion() {
    Alert.alert('Eliminar evento', `¿Eliminar "${evento.titulo}"? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => void ejecutarEliminacion(),
      },
    ]);
  }

  async function ejecutarEliminacion() {
    setErrorMutacion(null);
    try {
      await eliminar.mutateAsync();
      router.back();
    } catch (e) {
      if (e instanceof ApiError) {
        setErrorMutacion(e.message);
      } else {
        setErrorMutacion('No se pudo eliminar. Verifica tu conexión.');
      }
    }
  }

  return (
    <Animated.View
      style={[
        estilos.documento,
        {
          marginTop: insets.top + spacing.sm + ESPACIO_PARA_VOLVER,
          marginBottom: insets.bottom + spacing.md,
        },
        animEntrada,
      ]}>
      <ScrollView
        contentContainerStyle={[
          estilos.contenidoDoc,
          { paddingBottom: insets.bottom + spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* ── Header = el contenido del card, a escala documento ── */}
        <View style={estilos.headerFila}>
          <View style={estilos.fecha}>
            <ThemedText variant="title" weight="bold">
              {inicio.getDate().toString().padStart(2, '0')}
            </ThemedText>
            <ThemedText variant="caption" tone="secondary">
              {FORMATO_MES_CORTO.format(inicio).replace('.', '')}
            </ThemedText>
          </View>
          <View style={[estilos.barra, { backgroundColor: colorBarra(evento) }]} />
          <View style={estilos.headerCuerpo}>
            <ThemedText variant="subtitle" weight="semibold" numberOfLines={3}>
              {evento.titulo}
            </ThemedText>
            <FilaMeta texto={evento.diaCompleto ? 'Todo el día' : horaRango(evento)} icono={<ClockIcon size={14} color={colors.text.secondary} />} />
            {evento.lugar ? (
              <FilaMeta texto={evento.lugar} icono={<MapPinIcon size={14} color={colors.text.secondary} />} />
            ) : null}
          </View>
        </View>

        {/* ── Cuerpo del documento ── */}
        {evento.descripcion ? (
          <View style={estilos.seccion}>
            <SectionHeader title="Descripción" />
            <ThemedText variant="body">{evento.descripcion}</ThemedText>
          </View>
        ) : null}

        {evento.tipo === 'OFICIAL' ? (
          <View style={estilos.seccion}>
            <SectionHeader title="Organizado por" />
            <ThemedText variant="body" tone="secondary">
              {etiquetaAudiencia(evento.decanatoIds)}
            </ThemedText>
          </View>
        ) : null}

        {evento.tipo === 'OFICIAL' ? (
          <ThemedButton
            title={evento.participo ? 'Quitar de mi agenda' : 'Agregar a mi agenda'}
            variant={evento.participo ? 'secondary' : 'primary'}
            size="md"
            loading={participar.agregar.isPending || participar.quitar.isPending}
            onPress={() =>
              evento.participo ? participar.quitar.mutate(evento.id) : participar.agregar.mutate(evento.id)
            }
          />
        ) : null}

        {hayAcciones ? (
          <View style={estilos.acciones}>
            {acciones.puedeEditar ? (
              <ThemedButton
                title="Editar"
                variant="secondary"
                size="sm"
                onPress={() => router.push(`/eventos/nuevo?id=${evento.id}` as never)}
              />
            ) : null}
            {acciones.puedeEliminar ? (
              <ThemedButton
                title="Eliminar"
                variant="secondary"
                size="sm"
                loading={eliminar.isPending}
                disabled={eliminar.isPending}
                onPress={confirmarEliminacion}
              />
            ) : null}
          </View>
        ) : null}

        {errorMutacion ? (
          <ThemedText variant="caption" style={estilos.errorTexto}>
            {errorMutacion}
          </ThemedText>
        ) : null}
      </ScrollView>
    </Animated.View>
  );
}

function FilaMeta({ texto, icono }: { texto: string; icono: React.ReactNode }) {
  return (
    <View style={estilos.filaMeta}>
      {icono}
      <ThemedText variant="caption" tone="secondary" numberOfLines={1}>
        {texto}
      </ThemedText>
    </View>
  );
}

const FORMATO_MES_CORTO = new Intl.DateTimeFormat('es-VE', { month: 'short' });

/** Pantalla de carga/error: centrado en el canvas, sin documento. */
function Centrado({
  children,
  gap = false,
}: {
  children: React.ReactNode;
  gap?: boolean;
}) {
  return (
    <ThemedView variant="base" style={[estilos.centro, gap && estilos.centroConGap]}>
      {children}
    </ThemedView>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  // Volver flotante JUSTO ENCIMA del documento: bottom del botón toca el
  // borde superior del paper (documento marginTop lo garantiza) y sobra
  // respiro sm; sin solapes ni bordes atravesados. left alineado con la
  // esquina del documento; top final lo manda el render con insets.
  backFlotante: {
    position: 'absolute',
    left: spacing.lg,
    zIndex: 2,
  },
  // EL documento: un solo papel bond expandido a pantalla (4 esquinas
  // redondeadas sobre el canvas, receta oficial del Card). El margen
  // inferior local respeta el safe-area de la barra de control Android.
  documento: {
    flex: 1,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.card,
    marginHorizontal: spacing.lg,
    gap: spacing.md,
    ...elevation.sm,
    ...highlight.sm,
  },
  contenidoDoc: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  // Header del documento = el card expandido: fila día + barra + cuerpo.
  headerFila: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  fecha: {
    alignItems: 'center',
    alignSelf: 'center',
    gap: 0,
  },
  barra: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: radius.pill,
  },
  headerCuerpo: {
    flex: 1,
    gap: spacing.xs,
  },
  filaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  seccion: {
    gap: spacing.xs,
  },
  acciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  centroConGap: {
    gap: spacing.lg,
  },
  errorTexto: {
    color: colors.status.danger,
  },
});
