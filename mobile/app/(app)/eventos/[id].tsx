import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeftIcon, MapPinIcon, ClockIcon } from 'phosphor-react-native';

import { eliminarEvento } from '@/features/calendario/api/eventos.api';
import { etiquetaAudiencia } from '@/shared/lib/etiquetas';
import { accionesPermitidasEvento } from '@/features/calendario/hooks/eventos-permisos';
import { etiquetaRecordatorioMinutos } from '@/features/calendario/hooks/formulario-evento';
import { useEventoDetalle } from '@/features/calendario/hooks/useEventoDetalle';
import { useMutacionEvento } from '@/features/calendario/hooks/useMutacionEvento';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import type { Evento, TipoEvento } from '@/features/calendario/types';
import { colorBarra } from '@/features/calendario/components/TarjetaProximoEvento';
import { ApiError } from '@/shared/api/axios';
import { colors, radius, spacing } from '@/shared/ui';
import {
  BotonCircular,
  Card,
  SectionHeader,
  ThemedButton,
  ThemedText,
  ThemedView,
} from '@/shared/ui';

const FORMATO_MES_CORTO = new Intl.DateTimeFormat('es-VE', { month: 'short' });
const FORMATO_HORA = new Intl.DateTimeFormat('es-VE', { timeStyle: 'short' });

/** Detalle de evento estilo mock: back circular + "Detalles" centrado,
 *  tarjeta de fecha con barra por tipo, descripción y organización. Sin
 *  asistentes/RSVP (fuera del alcance de la tesis) ni acciones fantasma. */
export default function EventoDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useEventoDetalle(id);

  return (
    <ThemedView variant="base" style={estilos.container}>
      <SafeAreaView style={estilos.flex}>
        <View style={estilos.cabecera}>
          <BotonCircular label="Volver" onPress={() => router.back()}>
            <ArrowLeftIcon size={20} color={colors.brand.primary} weight="bold" />
          </BotonCircular>
          <ThemedText variant="subtitle" weight="semibold" style={estilos.tituloCabecera}>
            Detalles
          </ThemedText>
          <View style={estilos.espacioSimetrico} />
        </View>

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
          <Contenido evento={query.data} eventoId={id} />
        ) : null}
      </SafeAreaView>
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
  const inicio = new Date(evento.inicioAt);

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
      <Card style={estilos.tarjetaFecha}>
        <View style={estilos.fecha}>
          <ThemedText variant="subtitle" weight="bold">
            {inicio.getDate().toString().padStart(2, '0')}
          </ThemedText>
          <ThemedText variant="caption" tone="secondary">
            {FORMATO_MES_CORTO.format(inicio).replace('.', '')}
          </ThemedText>
        </View>
        <View style={[estilos.barra, { backgroundColor: colorBarra(evento.tipo) }]} />
        <View style={estilos.datosEvento}>
          <View style={estilos.filaDato}>
            <ClockIcon size={14} color={colors.text.secondary} />
            <ThemedText variant="caption" tone="secondary">
              {rangoHoras(evento)}
            </ThemedText>
          </View>
          {evento.lugar ? (
            <View style={estilos.filaDato}>
              <MapPinIcon size={14} color={colors.text.secondary} />
              <ThemedText variant="caption" tone="secondary" numberOfLines={1}>
                {evento.lugar}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </Card>

      <ThemedText variant="title" weight="semibold">
        {evento.titulo}
      </ThemedText>

      <View style={estilos.metaFila}>
        <ThemedView variant="sunken" style={estilos.chip}>
          <ThemedText variant="caption" weight="semibold">
            {tituloTipo(evento.tipo)}
          </ThemedText>
        </ThemedView>
        {recordatorio ? (
          <ThemedView variant="sunken" style={estilos.chip}>
            <ThemedText variant="caption" weight="semibold">
              {recordatorio}
            </ThemedText>
          </ThemedView>
        ) : null}
      </View>

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
  );
}

function tituloTipo(tipo: TipoEvento): string {
  return tipo === 'OFICIAL' ? 'Evento oficial' : 'Personal';
}

const FORMATO_FECHA_COMPLETA = new Intl.DateTimeFormat('es-VE', { dateStyle: 'full' });

function rangoHoras(evento: Evento): string {
  const inicio = new Date(evento.inicioAt);
  if (evento.diaCompleto) {
    return `${FORMATO_FECHA_COMPLETA.format(inicio)} — todo el día`;
  }
  if (evento.finAt) {
    return `${FORMATO_HORA.format(inicio)} - ${FORMATO_HORA.format(new Date(evento.finAt))}`;
  }
  return FORMATO_HORA.format(inicio);
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
    backgroundColor: colors.bg.canvas,
  },
  flex: { flex: 1 },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  tituloCabecera: {
    flex: 1,
    textAlign: 'center',
  },
  espacioSimetrico: {
    width: 40,
  },
  scroll: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  tarjetaFecha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  fecha: {
    alignItems: 'center',
    gap: 2,
  },
  barra: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: radius.pill,
  },
  datosEvento: {
    flex: 1,
    gap: 2,
  },
  filaDato: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
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
