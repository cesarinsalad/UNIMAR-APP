import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';

import { eliminarEvento } from '@/features/calendario/api/eventos.api';
import { etiquetaAudiencia } from '@/shared/lib/etiquetas';
import {
  accionesPermitidasEvento,
} from '@/features/calendario/hooks/eventos-permisos';
import {
  etiquetaRecordatorioMinutos,
} from '@/features/calendario/hooks/formulario-evento';
import { useEventoDetalle } from '@/features/calendario/hooks/useEventoDetalle';
import { useMutacionEvento } from '@/features/calendario/hooks/useMutacionEvento';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import type { Evento, TipoEvento } from '@/features/calendario/types';
import { ApiError } from '@/shared/api/axios';
import { colors, radius, spacing } from '@/shared/ui';
import { ThemedButton, ThemedText, ThemedView } from '@/shared/ui';
import { useState } from 'react';

const FORMATO_FECHA = new Intl.DateTimeFormat('es-VE', { dateStyle: 'full' });
const FORMATO_HORA = new Intl.DateTimeFormat('es-VE', { timeStyle: 'short' });

export default function EventoDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useEventoDetalle(id);

  return (
    <ThemedView variant="base" style={estilos.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: query.data?.titulo ?? 'Evento',
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
              ? 'Este evento ya no está disponible.'
              : 'No se pudo cargar el evento.'}
          </ThemedText>
        </Centrado>
      ) : query.data ? (
        <Contenido evento={query.data} eventoId={id} />
      ) : null}
    </ThemedView>
  );
}

function Contenido({ evento, eventoId }: { evento: Evento; eventoId: string }) {
  const usuario = useSesionStore((s) => s.usuario);
  const acciones = accionesPermitidasEvento({
    rol: usuario?.rol ?? null,
    esDueno: evento.usuarioId === usuario?.id,
    tipo: evento.tipo,
  });
  const hayAcciones = acciones.puedeEditar || acciones.puedeEliminar;

  const eliminar = useMutacionEvento(() => eliminarEvento(eventoId));
  const [errorMutacion, setErrorMutacion] = useState<string | null>(null);

  const recordatorio = etiquetaRecordatorioMinutos(evento.recordatorioMinutos);

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
    <ScrollView
      contentContainerStyle={estilos.scroll}
      showsVerticalScrollIndicator={false}>
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

      <ThemedText variant="headline" weight="bold">
        {evento.titulo}
      </ThemedText>

      <View style={estilos.metaFila}>
        <ThemedView variant="sunken" style={estilos.chip}>
          <ThemedText variant="caption" weight="semibold">
            {tituloTipo(evento.tipo)}
          </ThemedText>
        </ThemedView>
        {evento.tipo === 'OFICIAL' ? (
          <ThemedText variant="caption" tone="secondary">
            {etiquetaAudiencia(evento.decanatoIds)}
          </ThemedText>
        ) : null}
        {recordatorio ? (
          <ThemedView variant="sunken" style={estilos.chip}>
            <ThemedText variant="caption" weight="semibold">
              {recordatorio}
            </ThemedText>
          </ThemedView>
        ) : null}
      </View>

      <ThemedText variant="body" tone="secondary">
        {rangoLegible(evento)}
      </ThemedText>

      {evento.descripcion ? (
        <ThemedText variant="bodyLg">{evento.descripcion}</ThemedText>
      ) : null}
    </ScrollView>
  );
}

function tituloTipo(tipo: TipoEvento): string {
  return tipo === 'OFICIAL' ? 'Evento oficial' : 'Personal';
}

function rangoLegible(evento: Evento): string {
  if (evento.diaCompleto) {
    return `${FORMATO_FECHA.format(new Date(evento.inicioAt))} — todo el día`;
  }
  const inicio = new Date(evento.inicioAt);
  if (evento.finAt) {
    return `${FORMATO_FECHA.format(inicio)}, ${FORMATO_HORA.format(inicio)} a ${FORMATO_HORA.format(
      new Date(evento.finAt),
    )}`;
  }
  return `${FORMATO_FECHA.format(inicio)}, ${FORMATO_HORA.format(inicio)}`;
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
  errorTexto: {
    color: colors.status.danger,
  },
});