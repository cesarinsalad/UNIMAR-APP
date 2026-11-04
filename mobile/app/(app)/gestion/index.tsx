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
import { ThemedText, ThemedView, useEsDesktop } from '@/shared/ui';
import type { EstadoComunicado } from '@/features/comunicaciones/types';
import { PanelSeccion } from './_secciones/PanelSeccion';
import { ColasSeccion } from './_secciones/ColasSeccion';
import { EventosSeccion, type ModoEventos } from './_secciones/EventosSeccion';

type Seccion = 'panel' | 'colas' | 'eventos';

/** Nav de la consola; hrefs/fila únicos, sin navegadores anidados. */
const NAV: { clave: Seccion; etiqueta: string; icono: typeof SquaresFourIcon }[] = [
  { clave: 'panel', etiqueta: 'Panel', icono: SquaresFourIcon },
  { clave: 'colas', etiqueta: 'Comunicados', icono: ClipboardTextIcon },
  { clave: 'eventos', etiqueta: 'Eventos', icono: CalendarBlankIcon },
];

const ESTADOS_VALIDOS: EstadoComunicado[] = [
  'BORRADOR',
  'PENDIENTE',
  'PUBLICADO',
  'ARCHIVADO',
];

/**
 * Consola de staff — UNA pantalla con secciones por estado (Panel /
 * Comunicados / Eventos), sin navegadores anidados: el shell renderiza la
 * sección activa como View normal con flex propio (la receta que funciona
 * en toda la app, móvil y web). Guard de rol al frente: el estudiante que
 * teclea la URL en web rebota al tabs. Los editores
 * (/comunicados/nuevo, /eventos/nuevo) siguen siendo pantallas full-screen
 * del Stack del (app) que se abren sobre la consola.
 */
export default function ConsolaGestionScreen() {
  const permisos = usePermisos();
  const usuario = useSesionStore((s) => s.usuario);
  const esDesktop = useEsDesktop();
  // En web no existe "la app": el link "Volver a la app" sería muerto
  // (la compuerta del root rebota `/` de vuelta a la consola).
  const esWeb = Platform.OS === 'web';
  const { seccion: seccionParam, estado: estadoParam } = useLocalSearchParams<{
    seccion?: string;
    estado?: string;
  }>();

  // Deep-link tolerante: ?seccion=colas&estado=PENDIENTE pre-selecciona.
  const [seccion, setSeccion] = useState<Seccion>(
    seccionParam === 'colas' || seccionParam === 'eventos' ? seccionParam : 'panel',
  );
  const [estadoColas, setEstadoColas] = useState<EstadoComunicado>(
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

  function irColas(estado: EstadoComunicado) {
    setEstadoColas(estado);
    setSeccion('colas');
  }

  function irEventos() {
    setModoEventos({ vista: 'lista' });
    setSeccion('eventos');
  }

  function nuevoEvento() {
    setModoEventos({ vista: 'crear' });
    setSeccion('eventos');
  }

  const seccionActiva =
    seccion === 'panel' ? (
      <PanelSeccion
        onIrColas={irColas}
        onIrEventos={irEventos}
        onNuevoEvento={nuevoEvento}
      />
    ) : seccion === 'colas' ? (
      <ColasSeccion estado={estadoColas} onEstado={setEstadoColas} />
    ) : (
      <EventosSeccion modo={modoEventos} onModo={setModoEventos} />
    );

  if (esDesktop) {
    return (
      <View style={estilos.fila}>
        <ThemedView variant="base" style={estilos.sidebar}>
          {/* Masthead del rail: mismo tratamiento que el móvil — título en
              voz de la casa (semibold, no bold) y el rol como metadato pill. */}
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
          {usuario?.nombre ? (
            <ThemedText variant="caption" tone="secondary" numberOfLines={1} style={estilos.nombreSidebar}>
              {usuario.nombre}
            </ThemedText>
          ) : null}

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
      {/* Masthead de la casa: headline 28 en contenido (firma de los tabs);
          el rol queda como metadato pill, no como segundo título. */}
      <View style={estilos.cabeceraMovil}>
        <ThemedText variant="headline" weight="semibold">
          Gestión
        </ThemedText>
        <ThemedView variant="sunken" style={estilos.pillRol}>
          <ThemedText variant="caption" weight="semibold" style={estilos.pillRolTexto}>
            {usuario?.rol ?? ''}
          </ThemedText>
        </ThemedView>
      </View>
      {/* Nav interna: fila fija de pills táctiles; NUNCA flexea el alto —
          el resto de la pantalla es de la sección activa. View (no
          ScrollView): altura intrínseca y el wrap absorbe anchos muy
          angostos sin estirar el contenedor. */}
      <View style={estilos.chips}>
        {NAV.map(({ clave, etiqueta, icono: Icono }) => {
          const activo = seccion === clave;
          return (
            <Pressable
              key={clave}
              accessibilityRole="tab"
              accessibilityState={{ selected: activo }}
              onPress={() => setSeccion(clave)}>
              <ThemedView
                variant={activo ? 'sunken' : 'card'}
                style={estilos.itemNavMovil}>
                <Icono
                  size={18}
                  color={activo ? colors.brand.primary : colors.text.secondary}
                  weight={activo ? 'duotone' : 'regular'}
                />
                <ThemedText
                  variant="caption"
                  weight={activo ? 'semibold' : 'medium'}
                  style={activo ? { color: colors.brand.primary } : undefined}>
                  {etiqueta}
                </ThemedText>
              </ThemedView>
            </Pressable>
          );
        })}
      </View>
      <View style={estilos.contenido}>{seccionActiva}</View>
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
    width: 240,
    borderRightWidth: 1,
    borderRightColor: colors.border.subtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  // Ritmo de la casa (mismo contraste que el Panel): 24 entre grupos,
  // 8 etiqueta → contenido — no gap plano.
  sidebarCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  pillRol: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexShrink: 0,
  },
  pillRolTexto: { color: colors.brand.primary },
  nombreSidebar: { marginTop: spacing.sm },
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
  // Móvil: chrome mínimo (~2 filas fijas) y TODO el resto para el contenido.
  cabeceraMovil: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.four,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.four,
    paddingVertical: spacing.sm,
    gap: spacing.two,
  },
  itemNavMovil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: touchTarget.min,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
});
