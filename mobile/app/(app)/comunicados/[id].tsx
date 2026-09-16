import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import {
  aprobarComunicado,
  archivarComunicado,
  publicarComunicado,
  rechazarComunicado,
  solicitarRevisionComunicado,
} from '@/features/comunicaciones/api/comunicados.api';
import { CuerpoMarkdown } from '@/features/comunicaciones/components/CuerpoMarkdown';
import { SeccionAdjuntos } from '@/features/comunicaciones/components/SeccionAdjuntos';
import { chipEstado, etiquetaAudiencia } from '@/features/comunicaciones/helpers';
import { accionesPermitidas } from '@/features/comunicaciones/hooks/accionesPermitidas';
import { useComunicadoDetalle } from '@/features/comunicaciones/hooks/useComunicadoDetalle';
import { useMutacionComunicado } from '@/features/comunicaciones/hooks/useMutacionComunicado';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import type { Comunicado } from '@/features/comunicaciones/types';
import { ApiError } from '@/shared/api/axios';
import { colors, radius, spacing } from '@/shared/ui';
import { ThemedButton, ThemedText, ThemedView } from '@/shared/ui';

const FORMATO_FECHA_LARGA = new Intl.DateTimeFormat('es-VE', {
  dateStyle: 'long',
  timeStyle: 'short',
});

export default function ComunicadoDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useComunicadoDetalle(id);

  return (
    <ThemedView variant="base" style={estilos.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: query.data?.titulo ?? 'Comunicado',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.text.onPrimary,
          headerTitleStyle: { fontWeight: '600' },
        }}
      />

      {query.isPending ? (
        <Centrado>
          <ActivityIndicator color={colors.primary} />
        </Centrado>
      ) : query.isError ? (
        <Centrado gap>
          <ThemedText variant="subtitle" weight="semibold">
            {query.error instanceof ApiError && query.error.status === 404
              ? 'Este comunicado ya no está disponible.'
              : 'No se pudo cargar el comunicado.'}
          </ThemedText>
        </Centrado>
      ) : query.data ? (
        <Contenido comunicado={query.data} comunicadoId={id} />
      ) : null}
    </ThemedView>
  );
}

function Contenido({
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
    rechazar.isPending || solicitar.isPending || aprobar.isPending || publicar.isPending || archivar.isPending;

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

  return (
    <ScrollView
      contentContainerStyle={estilos.scroll}
      showsVerticalScrollIndicator={false}>
      {hayAcciones ? (
        <View style={estilos.acciones}>
          {acciones.puedeSolicitarRevision ? (
            <ThemedButton
              title="Solicitar revisión"
              variant="secondary"
              size="sm"
              disabled={algunaPendiente}
              onPress={() => void ejecutarAccion(() => solicitar.mutateAsync())}
            />
          ) : null}
          {acciones.puedeAprobar ? (
            <ThemedButton
              title="Aprobar"
              size="sm"
              disabled={algunaPendiente}
              onPress={() => void ejecutarAccion(() => aprobar.mutateAsync())}
            />
          ) : null}
          {acciones.puedeRechazar ? (
            <ThemedButton
              title="Rechazar"
              variant="secondary"
              size="sm"
              disabled={algunaPendiente}
              onPress={() => setModalAbierto(true)}
            />
          ) : null}
          {acciones.puedePublicar ? (
            <ThemedButton
              title="Publicar ahora"
              size="sm"
              disabled={algunaPendiente}
              onPress={() => void ejecutarAccion(() => publicar.mutateAsync())}
            />
          ) : null}
          {acciones.puedeArchivar ? (
            <ThemedButton
              title="Archivar"
              variant="secondary"
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

      <ThemedText variant="headline" weight="bold">
        {comunicado.titulo}
      </ThemedText>

      <View style={estilos.metaFila}>
        {chipEstado(comunicado.estado) ? (
          <ThemedView variant="sunken" style={estilos.chip}>
            <ThemedText variant="caption" weight="semibold">
              {chipEstado(comunicado.estado)}
            </ThemedText>
          </ThemedView>
        ) : null}
        <ThemedText variant="caption" tone="secondary">
          {etiquetaAudiencia(comunicado.decanatoIds)}
        </ThemedText>
      </View>

      {comunicado.motivoRechazo ? (
        <ThemedView variant="card" style={[estilos.motivoBox]}>
          <ThemedText variant="caption" weight="semibold">
            Motivo del rechazo
          </ThemedText>
          <ThemedText variant="body" tone="secondary">
            {comunicado.motivoRechazo}
          </ThemedText>
        </ThemedView>
      ) : null}

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
              placeholderTextColor={colors.text.tertiary}
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
                variant="primary"
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
    </ScrollView>
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
  container: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.six,
    gap: spacing.two,
  },
  centroConGap: {
    gap: spacing.four,
  },
  scroll: {
    padding: spacing.four,
    gap: spacing.three,
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
  },
  footer: {
    marginTop: spacing.four,
  },
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.four,
  },
  modalTarjeta: {
    width: '100%',
    gap: spacing.two,
  },
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
  textarea: {
    minHeight: 100,
  },
  errorTexto: {
    color: colors.status.danger,
  },
});