import { useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRightIcon } from 'phosphor-react-native';

import { aplanarPaginas } from '@/shared/lib/paginar';
import { colors, layout, spacing } from '@/shared/ui';
import {
  CargandoSeccion,
  Chip,
  EmptyState,
  HeaderTab,
  PressableScale,
  SectionHeader,
  ThemedText,
  ThemedView,
} from '@/shared/ui';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { usePermisos } from '@/features/identidad/hooks/usePermisos';
import { useComunicadosFeed } from '@/features/comunicaciones/hooks/useComunicadosFeed';
import { seleccionarParaCarrusel } from '@/features/comunicaciones/carrusel';
import { NoticiaCompacta } from '@/features/comunicaciones/components/NoticiaCompacta';
import { CarruselNoticias } from '@/features/comunicaciones/components/CarruselNoticias';
import { EventoAgendaCard } from '@/features/calendario/components/EventoAgendaCard';
import { ventanaDias } from '@/features/calendario/calendario-calculo';
import { useAgenda } from '@/features/calendario/hooks/useAgenda';

const DIAS_EVENTOS = 7;

/**
 * Tab de Noticias: encabezado con campana, carrusel de noticias destacadas
 * (prioriza las de tu decanato y las que traen portada, auto-rotación),
 * "últimas noticias" en filas compactas y eventos del campus de la semana
 * (link al discovery). La visibilidad de datos la decide RLS en el BFF.
 */
export default function ComunicadosScreen() {
  const insets = useSafeAreaInsets();
  const permisos = usePermisos();
  const decanatoId = useSesionStore((s) => s.usuario?.decanato_id ?? null);
  const feed = useComunicadosFeed();

  // 'todos': el carrusel de "Eventos del campus" muestra TODO lo visible
  // (incluidos oficiales que aún no agregaste) — es discovery, no agenda.
  const eventos = useAgenda(
    useMemo(() => ventanaDias(new Date(), DIAS_EVENTOS), []),
    'todos',
  );

  const comunicados = useMemo(
    () => (feed.data ? aplanarPaginas(feed.data.pages) : []),
    [feed.data],
  );

  const carrusel = useMemo(
    () => seleccionarParaCarrusel(comunicados, decanatoId),
    [comunicados, decanatoId],
  );

  // "Últimas noticias" es cronología pura de todo lo visible (RLS): el
  // carrusel usa un ranking de interés aparte, así que el solape es
  // intencional — cada sección responde a una pregunta distinta.
  const ultimas = useMemo(
    () => comunicados.slice(0, 4),
    [comunicados],
  );

  const proximos = useMemo(() => {
    if (!eventos.data) return [];
    const ahora = Date.now();
    return aplanarPaginas(eventos.data.pages)
      .filter((e) => new Date(e.inicioAt).getTime() >= ahora)
      .slice(0, 2);
  }, [eventos.data]);

  return (
    <ThemedView variant="base" style={estilos.pantalla}>
      <ScrollView
        contentContainerStyle={[
          estilos.scroll,
          {
            paddingTop: spacing.lg,
            paddingBottom: insets.bottom + layout.bottomTabInset + spacing.lg,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={feed.isRefetching || eventos.isRefetching}
            onRefresh={() => {
              void feed.refetch();
              void eventos.refetch();
            }}
            colors={[colors.brand.primary]}
          />
        }>
        {/* ── Encabezado: título + campana (+ Gestionar para staff) ── */}
        <HeaderTab
          titulo="Noticias"
        />

        {/* ── Gestionar (COMUNICADOR/ADMIN): la puerta del flujo de staff ── */}
        {permisos.puedeCrearComunicado ? (
          <Chip
            etiqueta="Gestionar mis comunicados"
            activa={false}
            onPress={() => router.push('/comunicados/mis')}
            style={{ alignSelf: 'flex-start' }}
          />
        ) : null}

        {/* ── Carrusel destacadas ── */}
        {feed.isPending ? (
          <CargandoSeccion />
        ) : carrusel.length > 0 ? (
          <CarruselNoticias comunicados={carrusel} />
        ) : (
          <EmptyState
            title="Sin noticias por ahora"
            message="Cuando se publiquen comunicados para tu audiencia, aparecerán aquí."
          />
        )}

        {/* ── Últimas noticias ── */}
        {ultimas.length > 0 ? (
          <View style={estilos.seccion}>
            <SectionHeader
              title="Últimas noticias"
              action={
                <PressableScale
                  accessibilityRole="link"
                  accessibilityLabel="Ver todas las noticias"
                  hitSlop={12}
                  onPress={() => router.navigate('/comunicados/listado')}>
                  <View style={estilos.enlaceFila}>
                    <ThemedText variant="bodySm" weight="semibold" style={estilos.enlace}>
                      Ver todas
                    </ThemedText>
                    <ArrowRightIcon size={14} color={colors.brand.primary} weight="bold" />
                  </View>
                </PressableScale>
              }
            />
            <View style={estilos.lista}>
              {ultimas.map((comunicado) => (
                <NoticiaCompacta key={comunicado.id} comunicado={comunicado} />
              ))}
              <View style={estilos.cierreLista} />
            </View>
          </View>
        ) : carrusel.length > 0 ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Ver todas las noticias"
            onPress={() => router.navigate('/comunicados/listado')}
            style={estilos.verTodasSueltas}>
            <View style={estilos.enlaceFila}>
              <ThemedText variant="body" weight="semibold" style={estilos.enlace}>
                Ver todas las noticias
              </ThemedText>
              <ArrowRightIcon size={16} color={colors.brand.primary} weight="bold" />
            </View>
          </PressableScale>
        ) : null}

        {/* ── Eventos del campus ── */}
        <View style={estilos.seccion}>
          <SectionHeader
            title="Eventos del campus"
            action={
              <PressableScale
                accessibilityRole="link"
                accessibilityLabel="Explorar todos los eventos del campus"
                hitSlop={12}
                onPress={() => router.push('/eventos/listado')}>
                <View style={estilos.enlaceFila}>
                  <ThemedText variant="bodySm" weight="semibold" style={estilos.enlace}>
                    Ver todos
                  </ThemedText>
                  <ArrowRightIcon size={14} color={colors.brand.primary} weight="bold" />
                </View>
              </PressableScale>
            }
          />
          {proximos.length === 0 ? (
            <EmptyState
              title="Sin eventos esta semana"
              message="Explora todos los eventos del campus y agrega los que te interesen."
              style={estilos.vacio}
            />
          ) : (
            <View style={estilos.lista}>
              {proximos.map((evento) => (
                <EventoAgendaCard key={evento.id} evento={evento} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

/** Spinner del feed. */
const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.bg.canvas },
  scroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  seccion: { gap: spacing.md },
  // El separador lo pone cada NoticiaCompacta (borderBottom editorial):
  // aquí solo se reserva el cierre de la última línea.
  lista: { marginBottom: spacing.sm },
  enlace: { color: colors.brand.primary },
  enlaceFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  vacio: { paddingVertical: spacing.xs },
  verTodasSueltas: {
    alignSelf: 'flex-start',
  },
  cierreLista: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
  },
});
