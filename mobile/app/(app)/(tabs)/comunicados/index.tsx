import { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { aplanarPaginas } from '@/shared/lib/paginar';
import { colors, layout, spacing } from '@/shared/ui';
import {
  CargandoSeccion,
  Chip,
  EmptyState,
  HeaderTab,
  SectionHeader,
  ThemedText,
  ThemedView,
} from '@/shared/ui';
import { usePermisos } from '@/features/identidad/hooks/usePermisos';
import { useComunicadosFeed } from '@/features/comunicaciones/hooks/useComunicadosFeed';
import { NoticiaCompacta } from '@/features/comunicaciones/components/NoticiaCompacta';
import { NoticiaDestacada } from '@/features/comunicaciones/components/NoticiaDestacada';
import { EventoAgendaCard } from '@/features/calendario/components/EventoAgendaCard';
import { ventanaDias } from '@/features/calendario/calendario-calculo';
import { useAgenda } from '@/features/calendario/hooks/useAgenda';
import { CampanaConBadge } from '@/features/notificaciones/components/CampanaConBadge';
import { useNoLeidas } from '@/features/notificaciones/hooks/useNoLeidas';

/** Chips de categoría (valor = wire snake_case; null = 'Todas'). */
const CHIPS: { valor: string | null; etiqueta: string }[] = [
  { valor: null, etiqueta: 'Todas' },
  { valor: 'ACADEMICO', etiqueta: 'Académico' },
  { valor: 'EVENTO', etiqueta: 'Eventos' },
  { valor: 'INSTITUCIONAL', etiqueta: 'Institucional' },
];

const DIAS_EVENTOS = 7;

/**
 * Tab de Noticias: encabezado claro con campana, chips de categoría,
 * tarjeta destacada, "últimas noticias" en filas compactas y eventos del
 * campus de la semana. La visibilidad de datos la decide RLS en el BFF.
 */
export default function ComunicadosScreen() {
  const insets = useSafeAreaInsets();
  const noLeidas = useNoLeidas();
  const permisos = usePermisos();
  const [chipActivo, setChipActivo] = useState<string | null>(null);
  const feed = useComunicadosFeed(chipActivo);

  const eventos = useAgenda(useMemo(() => ventanaDias(new Date(), DIAS_EVENTOS), []));

  const comunicados = useMemo(
    () => (feed.data ? aplanarPaginas(feed.data.pages) : []),
    [feed.data],
  );

  const destacada = useMemo(
    () => comunicados.find((c) => c.imagenPath !== null) ?? comunicados[0] ?? null,
    [comunicados],
  );

  const ultimas = useMemo(
    () => comunicados.filter((c) => c.id !== destacada?.id).slice(0, 4),
    [comunicados, destacada],
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
        contentContainerStyle={[estilos.scroll, { paddingTop: insets.top + spacing.lg }]}
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
          action={<CampanaConBadge total={noLeidas.data?.total ?? 0} tono="claro" />}
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

        {/* ── Chips de categoría ── */}
        <View style={estilos.chips}>
          {CHIPS.map((chip) => (
            <Chip
              key={chip.etiqueta}
              etiqueta={chip.etiqueta}
              activa={chip.valor === chipActivo}
              onPress={() => setChipActivo(chip.valor)}
            />
          ))}
        </View>

        {/* ── Destacada ── */}
        {feed.isPending ? (
          <CargandoSeccion />
        ) : destacada ? (
          <NoticiaDestacada comunicado={destacada} />
        ) : (
          <EmptyState
            title="Sin noticias por ahora"
            message="Cuando se publiquen comunicados para tu audiencia, aparecerán aquí."
          />
        )}

        {/* ── Últimas noticias ── */}
        {ultimas.length > 0 ? (
          <View style={estilos.seccion}>
            <SectionHeader title="Últimas noticias" />
            <View style={estilos.lista}>
              {ultimas.map((comunicado) => (
                <NoticiaCompacta key={comunicado.id} comunicado={comunicado} />
              ))}
            </View>
          </View>
        ) : null}

        {/* ── Eventos del campus ── */}
        <View style={estilos.seccion}>
          <SectionHeader
            title="Eventos del campus"
            action={
              <Pressable onPress={() => router.navigate('/calendario')} hitSlop={8}>
                <ThemedText variant="bodySm" weight="semibold" style={estilos.enlace}>
                  Ver agenda →
                </ThemedText>
              </Pressable>
            }
          />
          {proximos.length === 0 ? (
            <EmptyState
              title="Sin eventos esta semana"
              message="Abre la tab Agenda para ver el mes completo."
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
    paddingBottom: layout.bottomTabInset + spacing.lg,
    gap: spacing.lg,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.two },
  seccion: { gap: spacing.md },
  lista: { gap: spacing.md },
  enlace: { color: colors.brand.primary },
  vacio: { paddingVertical: spacing.xs },
});
