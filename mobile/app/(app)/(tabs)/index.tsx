import { useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRightIcon } from 'phosphor-react-native';

import { aplanarPaginas } from '@/shared/lib/paginar';
import { useRefrescarQueries } from '@/shared/lib/useRefrescarQueries';
import { colors, layout, spacing } from '@/shared/ui';
import {
  CargandoSeccion,
  EmptyState,
  HeaderTab,
  PressableScale,
  SectionHeader,
  ThemedText,
  ThemedView,
} from '@/shared/ui';
import { particionarMaterias } from '@/features/academico/helpers';
import { proximaClase } from '@/features/academico/proxima-clase';
import { ProximaClaseCard } from '@/features/academico/components/ProximaClaseCard';
import { useMaterias } from '@/features/academico/hooks/useMaterias';
import { NoticiaCard } from '@/features/comunicaciones/components/NoticiaCard';
import { useComunicadosFeed } from '@/features/comunicaciones/hooks/useComunicadosFeed';
import { EventoAgendaCard } from '@/features/calendario/components/EventoAgendaCard';
import { ventanaDias } from '@/features/calendario/calendario-calculo';
import { useAgenda } from '@/features/calendario/hooks/useAgenda';
import { CampanaConBadge } from '@/features/notificaciones/components/CampanaConBadge';
import { useNoLeidas } from '@/features/notificaciones/hooks/useNoLeidas';
import { useSesionStore } from '@/features/identidad/store/sesion.store';

const DIAS_VENTANA = 30;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refrescando, refrescar } = useRefrescarQueries();
  const usuario = useSesionStore((s) => s.usuario);
  const noLeidas = useNoLeidas();
  const materias = useMaterias();
  const feed = useComunicadosFeed();
  const ventana = useMemo(() => ventanaDias(new Date(), DIAS_VENTANA), []);
  const agenda = useAgenda(ventana);

  const primerNombre = usuario?.nombre.split(' ')[0] ?? 'unimarista';

  const clase = useMemo(() => {
    const actuales = particionarMaterias(materias.data ?? []).actuales;
    return proximaClase(actuales, new Date());
  }, [materias.data]);

  const noticias = useMemo(
    () => (feed.data ? aplanarPaginas(feed.data.pages).slice(0, 5) : []),
    [feed.data],
  );

  const proximos = useMemo(() => {
    if (!agenda.data) return [];
    const ahora = Date.now();
    return aplanarPaginas(agenda.data.pages)
      .filter((e) => new Date(e.inicioAt).getTime() >= ahora)
      .slice(0, 3);
  }, [agenda.data]);

  // Mensaje de la card informativa según si hay error o simplemente nada.
  const mensajeClase = materias.isError
    ? 'No se pudo cargar tu horario'
    : 'Sin clases próximas';

  return (
    <ThemedView variant="base" style={estilos.pantalla}>
      <ScrollView
        contentContainerStyle={[
          estilos.scroll,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: insets.bottom + layout.bottomTabInset + spacing.lg,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() =>
              void refrescar([['academico', 'materias'], ['comunicados'], ['eventos']])
            }
            tintColor={colors.brand.primary}
          />
        }>
        {/* ── Encabezado: título + campana + saludo ── */}
        <HeaderTab
          titulo="Inicio"
          saludo={`Bienvenido, ${primerNombre}!`}
          action={<CampanaConBadge total={noLeidas.data?.total ?? 0} tono="claro" />}
        />

        {/* ── Próxima clase (tarjeta estrella) ── */}
        {materias.isPending ? (
          <CargandoSeccion />
        ) : (
          <ProximaClaseCard
            clase={clase}
            mensajeVacio={mensajeClase}
            accionVacio={
              clase === null && !materias.isError
                ? { etiqueta: 'Ir a Agenda', onPress: () => router.navigate('/calendario') }
                : undefined
            }
          />
        )}

        {/* ── Tus noticias ── */}
        <View style={estilos.seccion}>
          <SectionHeader
            title="Tus noticias"
            action={
              <EnlaceSeccion
                etiqueta="Ver más"
                descripcion="Ver todas las noticias"
                onPress={() => router.navigate('/comunicados')}
              />
            }
          />
          {feed.isPending ? (
            <CargandoSeccion />
          ) : noticias.length === 0 ? (
            <EmptyState
              title="Sin noticias por ahora"
              message="Cuando tu decanato publique comunicados, aparecerán aquí."
              style={estilos.vacio}
            />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[estilos.noticias, { paddingRight: spacing.lg }]}>
              {noticias.map((comunicado) => (
                <NoticiaCard key={comunicado.id} comunicado={comunicado} />
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Próximos eventos ── */}
        <View style={estilos.seccion}>
          <SectionHeader
            title="Tus próximos eventos"
            action={
              <EnlaceSeccion
                etiqueta="Ver agenda"
                descripcion="Ver la agenda completa"
                onPress={() => router.navigate('/calendario')}
              />
            }
          />
          {agenda.isPending ? (
            <CargandoSeccion />
          ) : proximos.length === 0 ? (
            <EmptyState
              title="Sin próximos eventos"
              message="Los eventos oficiales y personales de los próximos 30 días se listan aquí."
              style={estilos.vacio}
            />
          ) : (
            <View style={estilos.listaEventos}>
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

/** Enlace de acción de sección: texto azul + flecha Phosphor (adiós "→" tipográfica). */
function EnlaceSeccion({
  etiqueta,
  descripcion,
  onPress,
}: {
  etiqueta: string;
  descripcion: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="link"
      accessibilityLabel={descripcion}
      hitSlop={12}
      onPress={onPress}>
      <View style={estilos.enlaceFila}>
        <ThemedText variant="bodySm" weight="semibold" style={estilos.enlace}>
          {etiqueta}
        </ThemedText>
        <ArrowRightIcon size={14} color={colors.brand.primary} weight="bold" />
      </View>
    </PressableScale>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.bg.canvas },
  scroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  seccion: { gap: spacing.md },
  noticias: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  listaEventos: { gap: spacing.md },
  enlace: { color: colors.brand.primary },
  enlaceFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  vacio: { paddingVertical: spacing.md },
});
