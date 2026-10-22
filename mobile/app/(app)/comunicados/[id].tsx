import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ArrowLeft, ShareNetwork as ShareIcon } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import {
  aprobarComunicado,
  archivarComunicado,
  publicarComunicado,
  rechazarComunicado,
  solicitarRevisionComunicado,
} from '@/features/comunicaciones/api/comunicados.api';
import { CuerpoMarkdown } from '@/features/comunicaciones/components/CuerpoMarkdown';
import { SeccionAdjuntos } from '@/features/comunicaciones/components/SeccionAdjuntos';
import { etiquetaCategoria } from '@/features/comunicaciones/helpers';
import { accionesPermitidas } from '@/features/comunicaciones/hooks/accionesPermitidas';
import {
  etiquetaLecturas,
  puedeVerEstadisticas,
  useEstadisticas,
} from '@/features/comunicaciones/hooks/estadisticas';
import { useComunicadoDetalle } from '@/features/comunicaciones/hooks/useComunicadoDetalle';
import { usePortada } from '@/features/comunicaciones/hooks/usePortada';
import { useMutacionComunicado } from '@/features/comunicaciones/hooks/useMutacionComunicado';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import type { Comunicado } from '@/features/comunicaciones/types';
import { ApiError } from '@/shared/api/axios';
import { haceRelativo, minutosLectura } from '@/shared/lib/tiempo';
import { excerpt } from '@/shared/lib/markdown';
import { colors, elevation, layout, radius, spacing } from '@/shared/ui';
import { Badge, ThemedButton, ThemedText, ThemedView } from '@/shared/ui';

const FORMATO_FECHA_LARGA = new Intl.DateTimeFormat('es-VE', {
  dateStyle: 'long',
  timeStyle: 'short',
});

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
  const insets = useSafeAreaInsets();
  const usuario = useSesionStore((s) => s.usuario);
  const acciones = accionesPermitidas({
    rol: usuario?.rol ?? null,
    esAutor: comunicado.autorId === usuario?.id,
    estado: comunicado.estado,
  });
  const hayAcciones = Object.values(acciones).some(Boolean);

  const rechazar = useMutacionComunicado((motivo: string) =>
    rechazarComunicado(comunicadoId, motivo),
  );
  const solicitar = useMutacionComunicado(() =>
    solicitarRevisionComunicado(comunicadoId),
  );
  const aprobar = useMutacionComunicado(() => aprobarComunicado(comunicadoId));
  const publicar = useMutacionComunicado(() => publicarComunicado(comunicadoId));
  const archivar = useMutacionComunicado(() => archivarComunicado(comunicadoId));

  const [modalAbierto, setModalAbierto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [errorMutacion, setErrorMutacion] = useState<string | null>(null);

  const algunaPendiente =
    rechazar.isPending ||
    solicitar.isPending ||
    aprobar.isPending ||
    publicar.isPending ||
    archivar.isPending;

  async function ejecutarAccion(accion: () => Promise<unknown>) {
    setErrorMutacion(null);
    try {
      await accion();
    } catch (e) {
      if (e instanceof ApiError) {
        setErrorMutacion(e.message);
      } else {
        setErrorMutacion('Error de red. Verifica tu conexión.');
      }
    }
  }

  // El motivo del rechazo lo ven autor y ADMIN (quiénes producen).
  const veGestion = acciones.puedeEditar || usuario?.rol === 'ADMIN';

  return (
    <View style={estilos.flex}>
      <View style={[estilos.filaBotones, { top: insets.top + spacing.md }]}>
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
                onPress={() => void ejecutarAccion(() => solicitar.mutateAsync())}
              />
            ) : null}
            {acciones.puedeAprobar ? (
              <ThemedButton
                title="Aprobar"
                variant="ghost"
                size="sm"
                disabled={algunaPendiente}
                onPress={() => void ejecutarAccion(() => aprobar.mutateAsync())}
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
                onPress={() => void ejecutarAccion(() => publicar.mutateAsync())}
              />
            ) : null}
            {acciones.puedeArchivar ? (
              <ThemedButton
                title="Archivar"
                variant="ghost"
                size="sm"
                disabled={algunaPendiente}
                onPress={() => void ejecutarAccion(() => archivar.mutateAsync())}
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
          <Badge label={etiquetaCategoria(comunicado)} tone="info" />

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

      {/* ── Modal del rechazo (gestión) ── */}
      <Modal
        visible={modalAbierto}
        transparent
        animationType="fade"
        onRequestClose={() => setModalAbierto(false)}>
        <View style={estilos.modalFondo}>
          <ThemedView variant="card" style={estilos.modalTarjeta}>
            <ThemedText variant="subtitle" weight="semibold">
              Motivo del rechazo
            </ThemedText>
            <ThemedText variant="caption" tone="secondary">
              Se informará al autor vía notificación (COMUNICADO_RECHAZADO).
            </ThemedText>
            <TextInput
              value={motivo}
              onChangeText={setMotivo}
              multiline
              maxLength={500}
              textAlignVertical="top"
              style={[estilos.input, estilos.textarea]}
              placeholder="Explica por qué se devuelve al autor..."
              placeholderTextColor={colors.text.secondary}
              editable={!rechazar.isPending}
            />
            <View style={estilos.modalBotones}>
              <ThemedButton
                title="Cancelar"
                variant="ghost"
                size="sm"
                onPress={() => setModalAbierto(false)}
              />
              <ThemedButton
                title="Rechazar"
                size="sm"
                loading={rechazar.isPending}
                disabled={motivo.trim().length === 0 || rechazar.isPending}
                onPress={() => {
                  const motivoLimpio = motivo.trim();
                  setModalAbierto(false);
                  void ejecutarAccion(() => rechazar.mutateAsync(motivoLimpio));
                }}
              />
            </View>
          </ThemedView>
        </View>
      </Modal>
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
    paddingTop: spacing.xl,
    paddingBottom: layout.bottomTabInset,
    gap: spacing.lg,
  },
  contenido: { gap: spacing.lg },
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
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.four,
  },
  modalTarjeta: { width: '100%', gap: spacing.two },
  modalBotones: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.two,
    marginTop: spacing.one,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.three,
    paddingVertical: spacing.three,
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: colors.background.base,
  },
  textarea: { minHeight: 100 },
  errorTexto: { color: colors.status.danger },
});
