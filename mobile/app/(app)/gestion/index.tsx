import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeftIcon,
  CalendarBlankIcon,
  ClipboardTextIcon,
  SignOutIcon,
  SquaresFourIcon,
} from 'phosphor-react-native';

import { usePermisos } from '@/features/identidad/hooks/usePermisos';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { colors, radius, spacing, touchTarget } from '@/shared/ui';
import { BotonCircular, ThemedText, ThemedView, useBreakpoint } from '@/shared/ui';
import { useDecanatos } from '@/features/identidad/hooks/useDecanatos';
import type { EstadoComunicado } from '@/features/comunicaciones/types';
import { ResumenSeccion } from './_secciones/ResumenSeccion';
import { ComunicadosSeccion, type EstadoCola } from './_secciones/ComunicadosSeccion';
import { EventosSeccion, type ModoEventos } from './_secciones/EventosSeccion';

type Seccion = 'resumen' | 'comunicados' | 'eventos';

/** Nav de la consola; hrefs/fila únicos, sin navegadores anidados. */
const NAV: { clave: Seccion; etiqueta: string; icono: typeof SquaresFourIcon }[] = [
  { clave: 'resumen', etiqueta: 'Resumen', icono: SquaresFourIcon },
  { clave: 'comunicados', etiqueta: 'Comunicados', icono: ClipboardTextIcon },
  { clave: 'eventos', etiqueta: 'Eventos', icono: CalendarBlankIcon },
];

const ESTADOS_VALIDOS: string[] = [
  'BORRADOR',
  'PENDIENTE',
  'PUBLICADO',
  'ARCHIVADO',
];

/** Deep-links tolerantes: ?seccion=colas (alias histórico) sigue resolviendo. */
function seccionDeParam(accion: string | undefined): Seccion {
  if (accion === 'colas') return 'comunicados';
  if (accion === 'comunicados') return 'comunicados';
  if (accion === 'eventos') return 'eventos';
  return 'resumen';
}

/**
 * Consola de staff — UNA pantalla con 3 secciones (doc §2): Resumen /
 * Comunicados (Camino A) / Eventos (Camino B). Navegación adaptativa
 * (doc §3): sidebar en escritorio, segmented control tactile bajo el
 * encabezado contextual en móvil/tablet. Sin navegadores anidados: el
 * shell renderiza la sección activa como View con flex propio. Guard de
 * rol al frente: el estudiante que teclea la URL rebota a los tabs. Los
 * editores de comunicados siguen como pantallas full-screen del Stack
 * (/comunicados/nuevo) abiertas sobre la consola.
 */
export default function ConsolaGestionScreen() {
  const permisos = usePermisos();
  const usuario = useSesionStore((s) => s.usuario);
  const breakpoint = useBreakpoint();
  const esEscritorio = breakpoint === 'escritorio';
  // En web no existe "la app": el link "Volver a la app" sería muerto
  // (la compuerta del root rebota `/` de vuelta a la consola).
  const esWeb = Platform.OS === 'web';
  const { seccion: seccionParam, estado: estadoParam } = useLocalSearchParams<{
    seccion?: string;
    estado?: string;
  }>();

  // Deep-link tolerante: ?seccion=colas&estado=PENDIENTE pre-selecciona.
  const [seccion, setSeccion] = useState<Seccion>(
    seccionParam ? seccionDeParam(String(seccionParam)) : 'resumen',
  );
  const [estadoCola, setEstadoCola] = useState<EstadoCola>(
    (ESTADOS_VALIDOS as string[]).includes(estadoParam ?? '')
      ? (estadoParam as EstadoComunicado)
      : 'BORRADOR',
  );
  // Modo de la sección de eventos: lista, creación o edición inline (el
  // formulario propio de la consola vive dentro del shell, sin navegar).
  const [modoEventos, setModoEventos] = useState<ModoEventos>({ vista: 'lista' });

  if (!permisos.puedeCrearComunicado) {
    return <Redirect href="/" />;
  }

  function irCola(estado: EstadoComunicado) {
    setEstadoCola(estado);
    setSeccion('comunicados');
  }

  function irEventos() {
    setModoEventos({ vista: 'lista' });
    setSeccion('eventos');
  }

  function volverALaApp() {
    router.navigate('/');
  }

  function nuevoEvento() {
    setModoEventos({ vista: 'crear' });
    setSeccion('eventos');
  }

  const seccionActiva =
    seccion === 'resumen' ? (
      <ResumenSeccion onIrCola={irCola} onIrEventos={irEventos} onNuevoEvento={nuevoEvento} />
    ) : seccion === 'comunicados' ? (
      <ComunicadosSeccion estado={estadoCola} onEstado={setEstadoCola} />
    ) : (
      <EventosSeccion modo={modoEventos} onModo={setModoEventos} />
    );

  if (esEscritorio) {
    return (
      <View style={estilos.fila}>
        <ThemedView variant="base" style={estilos.sidebar}>
          {/* Masthead del rail: título en voz de la casa + rol pill. */}
          <View style={estilos.sidebarCabecera}>
            <ThemedText variant="title" weight="semibold">
              Gestión
            </ThemedText>
            <ThemedView variant="sunken" style={estilos.pillRol}>
              <ThemedText variant="caption" weight="semibold" style={estilos.pillRolTexto}>
                {usuario?.rol ?? ''}
              </ThemedText>
            </ThemedView>
          </View>
          <EncabezadoAlcance />
          <View style={estilos.nav}>
            {NAV.map(({ clave, etiqueta, icono: Icono }) => {
              const activo = seccion === clave;
              return (
                <Pressable
                  key={clave}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activo }}
                  onPress={() => setSeccion(clave)}>
                  <ThemedView variant={activo ? 'sunken' : 'base'} style={estilos.itemNav}>
                    <Icono
                      size={20}
                      color={activo ? colors.brand.primary : colors.text.secondary}
                      weight={activo ? 'duotone' : 'regular'}
                    />
                    <ThemedText
                      variant="bodySm"
                      weight={activo ? 'semibold' : 'medium'}
                      style={activo ? { color: colors.brand.primary } : undefined}>
                      {etiqueta}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              );
            })}
          </View>

          {/* Cerrar sesión: acción del staff en la barra; el store limpia
              sesión y el guard del (app) rebota a /login. */}
          <View style={estilos.accionesSidebar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
              onPress={() => {
                void useSesionStore.getState().logout();
              }}>
              <View style={estilos.volverFila}>
                <SignOutIcon size={16} color={colors.status.danger} />
                <ThemedText variant="bodySm" weight="medium" style={estilos.salirTexto}>
                  Cerrar sesión
                </ThemedText>
              </View>
            </Pressable>
          </View>

          {!esWeb ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Volver a la app"
              onPress={() => router.navigate('/')}
              style={estilos.volverSidebar}>
              <View style={estilos.volverFila}>
                <ArrowLeftIcon size={16} color={colors.text.secondary} />
                <ThemedText variant="bodySm" tone="secondary" weight="medium">
                  Volver a la app
                </ThemedText>
              </View>
            </Pressable>
          ) : null}
        </ThemedView>

        <View style={estilos.contenido}>{seccionActiva}</View>
      </View>
    );
  }

  return (
    <View style={estilos.col}>
      {/* Header contextual (doc §Vista 1): título por rol + alcance. El back
          circular da salida en el teléfono (en escritorio lo da el sidebar
          "Volver a la app"); sin él, iOS no ofrecía gesto de vuelta — el
          headerShown: false elimina el gesto nativo. */}
      <View style={estilos.cabeceraMovil}>
        <BotonCircular label="Volver a la app" onPress={volverALaApp}>
          <ArrowLeftIcon size={20} color={colors.brand.primary} weight="bold" />
        </BotonCircular>
        <View style={{ flexShrink: 1, gap: 2 }}>
          <ThemedText variant="headline" weight="semibold" numberOfLines={2}>
            {permisos.esAdmin ? 'Consola Central de Gestión' : 'Gestión Decanal'}
          </ThemedText>
          <ThemedText variant="caption" tone="secondary" numberOfLines={1}>
            {permisos.esAdmin ? 'UNIMAR · alcance institucional' : 'Alcance de tu decanato'}
          </ThemedText>
        </View>
        <ThemedView variant="sunken" style={estilos.pillRol}>
          <ThemedText variant="caption" weight="semibold" style={estilos.pillRolTexto}>
            {usuario?.rol ?? ''}
          </ThemedText>
        </ThemedView>
      </View>

      {/* Segmented control fijo bajo el header (tabulaciones táctiles). */}
      <SegmentoNavegacion
        seccion={seccion}
        onSelect={setSeccion}
      />
      <View style={estilos.contenido}>{seccionActiva}</View>
    </View>
  );
}

/** Nombre del decanato activo (catálogo), para el encabezado decanal. */
function EncabezadoAlcance() {
  const usuario = useSesionStore((s) => s.usuario);
  const permisos = usePermisos();
  const decanatos = useDecanatos();

  const alcance = permisos.esAdmin
    ? 'Toda la plataforma'
    : decanatos.data?.find((d) => d.id === usuario?.decanato_id)?.nombre ??
      `Decanato ${usuario?.decanato_id ?? '—'}`;
  return (
    <ThemedText variant="caption" tone="secondary" numberOfLines={2} style={estilos.alcanceSidebar}>
      {alcance}
    </ThemedText>
  );
}

/** Segmented control táctil (doc §3 móvil): píldora de 3 segmentos. Solo
 *  texto: a 360dp el icono + etiqueta truncaba («Comunica…») — el estado
 *  activo ya vive en el tinte azul + semibold, el icono era ruido. */
function SegmentoNavegacion({
  seccion,
  onSelect,
}: {
  seccion: Seccion;
  onSelect: (seccion: Seccion) => void;
}) {
  return (
    <View style={estilos.segmentoWrap}>
      <View style={estilos.segmento}>
        {NAV.map(({ clave, etiqueta }) => {
          const activo = seccion === clave;
          return (
            <Pressable
              key={clave}
              accessibilityRole="tab"
              accessibilityState={{ selected: activo }}
              onPress={() => onSelect(clave)}
              style={estilos.segmentoOpcion}>
              <ThemedView variant={activo ? 'card' : 'base'} style={estilos.segmentoPieza}>
                <ThemedText
                  variant="caption"
                  weight={activo ? 'semibold' : 'medium'}
                  numberOfLines={1}
                  style={activo ? { color: colors.brand.primary } : undefined}>
                  {etiqueta}
                </ThemedText>
              </ThemedView>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  col: { flex: 1 },
  sidebar: {
    width: 252,
    borderRightWidth: 1,
    borderRightColor: colors.border.subtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  sidebarCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  alcanceSidebar: { marginTop: spacing.xs },
  pillRol: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexShrink: 0,
  },
  pillRolTexto: { color: colors.brand.primary },
  nav: { gap: spacing.xs, marginTop: spacing.xl },
  itemNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  accionesSidebar: {
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  volverSidebar: { marginTop: spacing.sm },
  salirTexto: { color: colors.status.danger },
  volverFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  contenido: { flex: 1 },

  /* ── Móvil/tablet: header contextual + segmented ── */
  cabeceraMovil: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  segmentoWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  segmento: {
    flexDirection: 'row',
    backgroundColor: colors.bg.sunken ?? colors.bg.surface,
    borderRadius: radius.pill,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  segmentoOpcion: { flex: 1 },
  segmentoPieza: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: touchTarget.min,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
});
