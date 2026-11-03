import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ArrowLeft, ShareNetwork as ShareIcon } from 'phosphor-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import {
  aprobarComunicado,
  archivarComunicado,
  publicarComunicado,
  rechazarComunicado,
  solicitarRevisionComunicado,
} from '@/features/comunicaciones/api/comunicados.api';
import { CuerpoMarkdown } from '@/features/comunicaciones/components/CuerpoMarkdown';
import { ModalRechazo } from '@/features/comunicaciones/components/ModalRechazo';
import { SeccionAdjuntos } from '@/features/comunicaciones/components/SeccionAdjuntos';
import { accionesPermitidas } from '@/features/comunicaciones/hooks/accionesPermitidas';
import {
  etiquetaLecturas,
  puedeVerEstadisticas,
  useEstadisticas,
} from '@/features/comunicaciones/hooks/estadisticas';
import { useComunicadoDetalle } from '@/features/comunicaciones/hooks/useComunicadoDetalle';
import { usePortada } from '@/features/comunicaciones/hooks/usePortada';
import { useTransicionComunicado } from '@/features/comunicaciones/hooks/useMutacionComunicado';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import type { Comunicado } from '@/features/comunicaciones/types';
import { ApiError } from '@/shared/api/axios';
import { haceRelativo, minutosLectura } from '@/shared/lib/tiempo';
import { excerpt } from '@/shared/lib/markdown';
import { colors, elevation, layout, radius, spacing } from '@/shared/ui';
import { ThemedButton, ThemedText, ThemedView } from '@/shared/ui';

const FORMATO_FECHA_LARGA = new Intl.DateTimeFormat('es-VE', {
  dateStyle: 'long',
  timeStyle: 'short',
});

type AccionDetalle = 'solicitar' | 'aprobar' | 'rechazar' | 'publicar' | 'archivar';

export default function ComunicadoDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useComunicadoDetalle(id);

  return (
    <ThemedView variant="base" style={estilos.container}>
      {/* Header propio tipo lector (back + share flotantes); título en contenido. */}
      <Stack.Screen options={{ headerShown: false }} />

      {query.isPending ? (
        <Centrado>
          <ActivityIndicator color={colors.brand.primary} />
        </Centrado>
      ) : query.isError ? (
        <Centrado gap>
          <ThemedText variant="subtitle" weight="semibold">
            {query.error instanceof ApiError && query.error.status === 404
              ? 'Esta noticia ya no está disponible.'
              : 'No se pudo cargar la noticia.'}
          </ThemedText>
        </Centrado>
      ) : query.data ? (
        <DetalleLector comunicado={query.data} comunicadoId={id} />
      ) : null}
    </ThemedView>
  );
}

/** Botón circular blanco (back/share) flotante sobre el contenido. */
function BotonCircular({
  onPress,
  label,
  children,
}: {
  onPress: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [estilos.circulo, pressed && { opacity: 0.85 }]}>
      {children}
    </Pressable>
  );
}

/** Chip "N lecturas" — texto gris; solo autor o ADMIN. */
function VerLecturas({
  comunicado,
  comunicadoId,
}: {
  comunicado: Comunicado;
  comunicadoId: string;
}) {
  const usuario = useSesionStore((s) => s.usuario);
  const stats = useEstadisticas(
    comunicadoId,
    puedeVerEstadisticas(usuario?.rol ?? null, comunicado.autorId === usuario?.id),
  );

  if (!stats.data) return null;

  return (
    <ThemedText variant="caption" tone="tertiary">
      {etiquetaLecturas(stats.data.lecturas)}
    </ThemedText>
  );
}

/**
 * Detalle tipo lector (Figma): portada 3:2 con pie opcional sobre
 * gradiente; badge de categoría; título headline + lead (excerpt);
 * tarjeta de autor con lecturas; divisor sutil; cuerpo Markdown; adjuntos;
 * footer de publicación. Las acciones de gestión viven en una fila compacta
 * (visible solo con permisos); rechazo con modal confirmatorio intacto.
 */
function DetalleLector({
  comunicado,
  comunicadoId,
}: {
  comunicado: Comunicado;
  comunicadoId: string;
}) {
  const usuario = useSesionStore((s) => s.usuario);
  const acciones = accionesPermitidas({
    rol: usuario?.rol ?? null,
    esAutor: comunicado.autorId === usuario?.id,
    estado: comunicado.estado,
  });
  const hayAcciones = Object.values(acciones).some(Boolean);

  /**
   * UNA mutación de transición (optimista) para las 5 acciones del ciclo:
   * la fila sale de las listas cacheadas al instante y el detalle se pisa
   * con la entidad devuelta; rollback exacto si el BFF rechaza.
   */
  const transicion = useTransicionComunicado<{ accion: AccionDetalle; id: string; motivo?: string }>(
    (id, motivo, args) => {
      switch (args.accion) {
        case 'solicitar':
          return solicitarRevisionComunicado(id);
        case 'aprobar':
          return aprobarComunicado(id);
        case 'rechazar':
          return rechazarComunicado(id, motivo);
        case 'publicar':
          return publicarComunicado(id);
        case 'archivar':
          return archivarComunicado(id);
      }
    },
  );

  const [modalAbierto, setModalAbierto] = useState(false);
  const [errorRechazo, setErrorRechazo] = useState<string | null>(null);
  const [errorMutacion, setErrorMutacion] = useState<string | null>(null);

  const algunaPendiente = transicion.isPending;

  async function ejecutarAccion(accion: AccionDetalle, motivo = '') {
    setErrorMutacion(null);
    try {
      await transicion.mutateAsync({ accion, id: comunicadoId, motivo: motivo || undefined });
    } catch (e) {
      if (e instanceof ApiError) {
        setErrorMutacion(e.message);
      } else {
        setErrorMutacion('Error de red. Verifica tu conexión.');
      }
    }
  }

  const veGestion = acciones.puedeEditar || usuario?.rol === 'ADMIN';

  return (
    <View style={estilos.flex}>
      <View style={[estilos.filaBotones, { top: spacing.md }]}>
        <BotonCircular label="Volver" onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.brand.primary} weight="bold" />
        </BotonCircular>
        <BotonCircular
          label={`Compartir: ${comunicado.titulo}`}
          onPress={() => {
            void Share.share({
              message: `${comunicado.titulo} — unimarapp://comunicados/${comunicadoId}`,
            });
          }}>
          <ShareIcon size={20} color={colors.brand.primary} weight="fill" />
        </BotonCircular>
      </View>

      <ScrollView
        contentContainerStyle={estilos.scroll}
        showsVerticalScrollIndicator={false}>
        {hayAcciones ? (
          <View style={estilos.acciones}>
            {acciones.puedeSolicitarRevision ? (
              <ThemedButton
                title="Solicitar revisión"
                variant="ghost"
                size="sm"
                disabled={algunaPendiente}
                onPress={() => void ejecutarAccion('solicitar')}
              />
            ) : null}
            {acciones.puedeAprobar ? (
              <ThemedButton
                title="Aprobar"
                variant="ghost"
                size="sm"
                disabled={algunaPendiente}
                onPress={() => void ejecutarAccion('aprobar')}
              />
            ) : null}
            {acciones.puedeRechazar ? (
              <ThemedButton
                title="Rechazar"
                variant="ghost"
                size="sm"
                disabled={algunaPendiente}
                onPress={() => setModalAbierto(true)}
              />
            ) : null}
            {acciones.puedePublicar ? (
              <ThemedButton
                title="Publicar ahora"
                variant="ghost"
                size="sm"
                disabled={algunaPendiente}
                onPress={() => void ejecutarAccion('publicar')}
              />
            ) : null}
            {acciones.puedeArchivar ? (
              <ThemedButton
                title="Archivar"
                variant="ghost"
                size="sm"
                disabled={algunaPendiente}
                onPress={() => void ejecutarAccion('archivar')}
              />
            ) : null}
            {acciones.puedeEditar ? (
              <ThemedButton
                title="Editar"
                variant="ghost"
                size="sm"
                disabled={algunaPendiente}
                onPress={() => router.push(`/comunicados/nuevo?id=${comunicado.id}` as never)}
              />
            ) : null}
          </View>
        ) : null}

        {errorMutacion ? (
          <ThemedText variant="caption" style={estilos.errorTexto}>
            {errorMutacion}
          </ThemedText>
        ) : null}

        {/* ── Portada con pie sobre gradiente ── */}
        {comunicado.imagenPath ? (
          <PortadaDetalle comunicadoId={comunicadoId} pie={comunicado.imagenPie} />
        ) : null}

        <View style={estilos.contenido}>
          <ThemedText variant="headline" weight="bold">
            {comunicado.titulo}
          </ThemedText>
          <ThemedText variant="bodyLg" tone="secondary">
            {excerpt(comunicado.cuerpo)}
          </ThemedText>

          <TarjetaAutor comunicado={comunicado} comunicadoId={comunicadoId} />

          {veGestion && comunicado.motivoRechazo ? (
            <ThemedView variant="card" style={estilos.motivoBox}>
              <ThemedText variant="caption" weight="semibold" style={estilos.motivoTitulo}>
                Motivo del rechazo
              </ThemedText>
              <ThemedText variant="body" tone="secondary">
                {comunicado.motivoRechazo}
              </ThemedText>
            </ThemedView>
          ) : null}

          <Divisor />
          <CuerpoMarkdown cuerpo={comunicado.cuerpo} />
          <SeccionAdjuntos comunicadoId={comunicado.id} puedeEditar={acciones.puedeEditar} />

          <View style={estilos.footer}>
            <ThemedText variant="caption" tone="tertiary">
              {comunicado.publicadoAt
                ? `Publicado el ${FORMATO_FECHA_LARGA.format(new Date(comunicado.publicadoAt))}`
                : null}
              {comunicado.expiraAt && comunicado.estado !== 'ARCHIVADO'
                ? ` · Vigente hasta ${FORMATO_FECHA_LARGA.format(new Date(comunicado.expiraAt))}`
                : null}
            </ThemedText>
          </View>
        </View>
      </ScrollView>

      {/* ── Modal del rechazo (gestión, compartido con la cola) ──
          Sin perder el motivo: se cierra SOLO si la mutación tuvo éxito;
          el error se muestra DENTRO del modal y el texto queda intacto. */}
      <ModalRechazo
        visible={modalAbierto}
        cargando={transicion.isPending}
        error={errorRechazo ?? undefined}
        onCancelar={() => {
          setModalAbierto(false);
          setErrorRechazo(null);
        }}
        onConfirmar={async (motivoLimpio) => {
          setErrorRechazo(null);
          try {
            await transicion.mutateAsync({
              accion: 'rechazar',
              id: comunicadoId,
              motivo: motivoLimpio,
            });
            setModalAbierto(false);
          } catch (e) {
            setErrorRechazo(
              e instanceof ApiError ? e.message : 'Error de red. Verifica tu conexión.',
            );
          }
        }}
      />
    </View>
  );
}

/** Avatar azul con inicial, nombre autor, hace + lectura + lecturas. */
function TarjetaAutor({
  comunicado,
  comunicadoId,
}: {
  comunicado: Comunicado;
  comunicadoId: string;
}) {
  const inicial = (comunicado.autorNombre.charAt(0) ?? '?').toUpperCase();

  return (
    <View style={estilos.autor}>
      <ThemedView style={estilos.avatar}>
        <ThemedText variant="body" weight="bold" tone="onPrimary">
          {inicial === '' ? '?' : inicial}
        </ThemedText>
      </ThemedView>
      <View style={estilos.autorTextos}>
        <ThemedText variant="bodySm" weight="semibold" numberOfLines={1}>
          {comunicado.autorNombre}
        </ThemedText>
        <View style={estilos.autorMeta}>
          <ThemedText variant="caption" tone="tertiary" numberOfLines={1}>
            {`${haceRelativo(comunicado.publicadoAt ?? comunicado.createdAt)} · ${minutosLectura(comunicado.cuerpo)} min de lectura`}
          </ThemedText>
          <VerLecturas comunicado={comunicado} comunicadoId={comunicadoId} />
        </View>
      </View>
    </View>
  );
}

/** Línea sutil de separación (nunca dura: royal). */
function Divisor() {
  return <View style={estilos.divisor} />;
}

/** Portada 3:2 en el detalle (URL firmada cache id; pie sobre gradiente). */
function PortadaDetalle({ comunicadoId, pie }: { comunicadoId: string; pie: string | null }) {
  const portada = usePortada(comunicadoId, true);
  if (!portada.url) return null;
  return (
    <View style={estilos.portadaWrap}>
      <Image
        source={{ uri: portada.url }}
        style={estilos.portadaDetalle}
        resizeMode="cover"
      />
      {pie ? (
        <>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.65)']}
            style={estilos.pieGradiente}
          />
          <ThemedText variant="caption" style={estilos.pieTexto} numberOfLines={2}>
            {pie}
          </ThemedText>
        </>
      ) : null}
    </View>
  );
}

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
  portadaWrap: { position: 'relative' },
  portadaDetalle: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.card },
  pieGradiente: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '30%',
    borderBottomLeftRadius: radius.card,
    borderBottomRightRadius: radius.card,
  },
  pieTexto: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.sm,
    color: colors.bg.surface,
    opacity: 0.9,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  flex: { flex: 1 },
  filaBotones: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  circulo: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.md,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.six,
    gap: spacing.two,
  },
  centroConGap: { gap: spacing.four },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.twelve,
    paddingBottom: layout.bottomTabInset,
    gap: spacing.lg,
  },
  // Documento centrado en desktop (maxWidth editorial); en móvil la
  // ventana es más angosta y el estilo no cambia nada.
  contenido: {
    gap: spacing.lg,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  metaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.two,
    flexWrap: 'wrap',
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.two,
    paddingVertical: spacing.one,
    borderRadius: radius.sm,
  },
  acciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.two,
  },
  motivoBox: {
    borderColor: colors.status.danger,
    borderWidth: 1,
    backgroundColor: colors.background.elevated,
    gap: spacing.xs,
  },
  motivoTitulo: { color: colors.status.danger },
  divisor: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
  },
  autor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autorTextos: { flex: 1, gap: spacing.half },
  autorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  footer: { marginTop: spacing.xs },
  errorTexto: { color: colors.status.danger },
});
