import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  MapPinIcon,
  ClockIcon,
  PencilSimpleIcon,
  TrashIcon,
} from 'phosphor-react-native';

import { eliminarEvento } from '../api/eventos.api';
import { accionesPermitidasEvento } from '../hooks/eventos-permisos';
import { useEventoDetalle } from '../hooks/useEventoDetalle';
import { useMutacionEvento } from '../hooks/useMutacionEvento';
import { useParticipacion } from '../hooks/useParticipacion';
import type { Evento } from '../types';
import { colorBarra, horaRango } from './TarjetaProximoEvento';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { etiquetaAudiencia } from '@/shared/lib/etiquetas';
import { ApiError } from '@/shared/api/axios';
import {
  BotonCircular,
  HojaInferior,
  ModalConfirmacion,
  SectionHeader,
  ThemedButton,
  ThemedText,
  colors,
  radius,
  spacing,
} from '@/shared/ui';

export interface HojaEventoProps {
  /** null = cerrada (y sin fetch); con id = presentada sobre ese evento. */
  eventoId: string | null;
  /** Cierre definitivo. Conviene pasarla ya cerrado (arrastre, dim o back
   *  nativo), o por `cerrar` de los contenidos (X, éxito de mutación). */
  onCerrar: () => void;
}

/**
 * Detalle del evento — organicer ÚNICO, ahora en HOJA INFERIOR (bottom
 * sheet): reemplaza al Documento de /eventos/[id], que quedó como
 * anfitrión transparente reutilizando esta misma hoja. Receta:
 * TarjetaProximoEvento expandida (header día+barra+título+meta) +
 * descripción + organizador + CTA de agenda (OFICIAL) + acciones staff
 * (espejo del RBAC-RLS). Los caminos externos — deep-links de push y la
 * consola de gestión — aterrizan en el anfitrión y presentan ESTA hoja.
 */
export function HojaEvento({ eventoId, onCerrar }: HojaEventoProps) {
  return (
    <HojaInferior abierto={eventoId !== null} onCerrar={onCerrar}>
      {({ cerrar }) =>
        eventoId === null ? null : (
          <Contenido eventoId={eventoId} cerrar={cerrar} />
        )
      }
    </HojaInferior>
  );
}

interface ContenidoProps {
  eventoId: string;
  /** Cierre animado gestionado por la hoja; onDidDismiss sube el cierre
   *  definitivo (limpia estado o hace router.back() en el anfitrión). Ese
   *  cierre llega del éxito de eliminar o del arrastre/dim/back nativo. */
  cerrar: () => void;
}

function Contenido({ eventoId, cerrar }: ContenidoProps) {
  const router = useRouter();
  const query = useEventoDetalle(eventoId);

  if (query.isPending) return <Estado mensaje="Cargando evento…" />;
  if (query.isError || !query.data) {
    return (
      <Estado
        mensaje={
          query.error instanceof ApiError && query.error.status === 404
            ? 'Este evento ya no está disponible.'
            : 'No se pudo cargar el evento. Revisa tu conexión.'
        }>
        <ThemedButton
          title="Reintentar"
          variant="secondary"
          size="sm"
          onPress={() => void query.refetch()}
        />
      </Estado>
    );
  }
  return <Documento evento={query.data} eventoId={eventoId} cerrar={cerrar} router={router} />;
}

function Estado({ mensaje, children }: { mensaje: string; children?: React.ReactNode }) {
  return (
    <View style={estilos.estado}>
      <ThemedText tone="secondary">{mensaje}</ThemedText>
      {children}
    </View>
  );
}

/** Cuerpo de la hoja: vertical con el ritmo de STYLE.md §3 — `xl` (24)
 *  entre secciones distintas, internos menores (regla de proximidad):
 *  cabecera (X+header a md), secciones (sm), cluster de acciones (md).
 *  `cerrar` viene de la hoja (vía su render prop): X y éxito de
 *  eliminación se despiden animados, no a secas. */
function Documento({
  evento,
  eventoId,
  cerrar,
  router,
}: {
  evento: Evento;
  eventoId: string;
  cerrar: () => void;
  router: ReturnType<typeof useRouter>;
}) {
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
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);

  async function ejecutarEliminacion() {
    setErrorMutacion(null);
    try {
      await eliminar.mutateAsync();
      cerrar();
    } catch (e) {
      if (e instanceof ApiError) {
        setErrorMutacion(e.message);
      } else {
        setErrorMutacion('No se pudo eliminar. Verifica tu conexión.');
      }
    }
  }

  function abrirEdicion() {
    cerrar();
    router.push(`/eventos/nuevo?id=${eventoId}` as never);
  }

  /** El círculo no trae disabled: el guard cubre el doble-tap mientras
   *  corre la mutación (el círculo muestra el spinner en su lugar). */
  function pedirBorrado() {
    if (eliminar.isPending) return;
    setConfirmarBorrado(true);
  }

  return (
    <View style={estilos.cuerpo}>
      {/* ── Cabecera de identidad: el card expandido (día + barra + título
          + hora + lugar). El cierre propio no lleva botón: en la hoja el
          cierre son el arrastre hacia abajo, el dim y el botón back ── */}
      <View style={estilos.headerFila}>
        <View style={estilos.fecha}>
          <ThemedText variant="title" weight="bold">
            {inicio.getDate().toString().padStart(2, '0')}
          </ThemedText>
          <ThemedText variant="caption" tone="secondary">
            {new Intl.DateTimeFormat('es-VE', { month: 'short' })
              .format(inicio)
              .replace('.', '')}
          </ThemedText>
        </View>
        <View style={[estilos.barra, { backgroundColor: colorBarra(evento) }]} />
        <View style={estilos.headerCuerpo}>
          <ThemedText variant="subtitle" weight="semibold" numberOfLines={3}>
            {evento.titulo}
          </ThemedText>
          <FilaMeta
            texto={evento.diaCompleto ? 'Todo el día' : horaRango(evento)}
            icono={<ClockIcon size={14} color={colors.text.secondary} />}
          />
          {evento.lugar ? (
            <FilaMeta
              texto={evento.lugar}
              icono={<MapPinIcon size={14} color={colors.text.secondary} />}
            />
          ) : null}
        </View>
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

      {/* ── Cluster de acciones: lo mismo contexto — CTA de agenda + botones
          staff + error de mutación, a md entre sí; el xl del cuerpo lo
          separa de las secciones de arriba ── */}
      {evento.tipo === 'OFICIAL' || hayAcciones || errorMutacion ? (
        <View style={estilos.clusterAcciones}>
          {evento.tipo === 'OFICIAL' ? (
            <ThemedButton
              title={evento.participo ? 'Quitar de mi agenda' : 'Agregar a mi agenda'}
              variant={evento.participo ? 'secondary' : 'primary'}
              size="md"
              loading={participar.agregar.isPending || participar.quitar.isPending}
              onPress={() =>
                evento.participo
                  ? participar.quitar.mutate(evento.id)
                  : participar.agregar.mutate(evento.id)
              }
            />
          ) : null}

          {hayAcciones ? (
            <View style={estilos.acciones}>
              {acciones.puedeEditar ? (
                <BotonCircular label="Editar evento" onPress={abrirEdicion}>
                  <PencilSimpleIcon size={20} color={colors.brand.primary} weight="bold" />
                </BotonCircular>
              ) : null}
              {acciones.puedeEliminar ? (
                <BotonCircular label="Eliminar evento" onPress={pedirBorrado}>
                  {eliminar.isPending ? (
                    <ActivityIndicator size={20} color={colors.status.danger} />
                  ) : (
                    <TrashIcon size={20} color={colors.status.danger} weight="bold" />
                  )}
                </BotonCircular>
              ) : null}
            </View>
          ) : null}

          {errorMutacion ? (
            <ThemedText variant="caption" style={estilos.errorTexto}>
              {errorMutacion}
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      <ModalConfirmacion
        visible={confirmarBorrado}
        titulo="Eliminar evento"
        mensaje={`¿Eliminar "${evento.titulo}"? Esta acción no se puede deshacer.`}
        textoConfirmar="Eliminar"
        destructive
        cargando={eliminar.isPending}
        onConfirmar={() => {
          setConfirmarBorrado(false);
          void ejecutarEliminacion();
        }}
        onCancelar={() => setConfirmarBorrado(false)}
      />
    </View>
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

const estilos = StyleSheet.create({
  /** Raíz del Documento = jerarquía espacial según STYLE.md §3: gap xl
   *  (24) entre secciones distintas; los internos van menor (regla de
   *  proximidad) por secciones (sm) y cluster (md). */
  cuerpo: {
    gap: spacing.xl,
  },
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
  /** Sección: título (SectionHeader) ↔ contenido a sm (8) — §3: la
   *  separación título/aula de toda ficha del sistema. */
  seccion: {
    gap: spacing.sm,
  },
  clusterAcciones: {
    gap: spacing.md,
  },
  /** Botones circulares de staff alineados a la derecha: el CTA de agenda
   *  vira full-width sobre ellos — la fila no compite con el CTA. */
  acciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  errorTexto: {
    color: colors.status.danger,
  },
  estado: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
});
