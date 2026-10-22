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
import { clasesDeDia } from '@/features/academico/clases-de-dia';
import { ProximaClaseCard } from '@/features/academico/components/ProximaClaseCard';
import { AgendaDia } from '@/features/academico/components/AgendaDia';
import { useMaterias } from '@/features/academico/hooks/useMaterias';
import { NoticiaCard } from '@/features/comunicaciones/components/NoticiaCard';
import { useComunicadosFeed } from '@/features/comunicaciones/hooks/useComunicadosFeed';
import { CampanaConBadge } from '@/features/notificaciones/components/CampanaConBadge';
import { useNoLeidas } from '@/features/notificaciones/hooks/useNoLeidas';
import { useSesionStore } from '@/features/identidad/store/sesion.store';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refrescando, refrescar } = useRefrescarQueries();
  const usuario = useSesionStore((s) => s.usuario);
  const noLeidas = useNoLeidas();
  const materias = useMaterias();
  const feed = useComunicadosFeed();

  const primerNombre = usuario?.nombre.split(' ')[0] ?? 'unimarista';

  const clase = useMemo(() => {
    const actuales = particionarMaterias(materias.data ?? []).actuales;
    return proximaClase(actuales, new Date());
  }, [materias.data]);

  const noticias = useMemo(
    () => (feed.data ? aplanarPaginas(feed.data.pages).slice(0, 5) : []),
    [feed.data],
  );

  const clases = useMemo(() => {
    const actuales = particionarMaterias(materias.data ?? []).actuales;
    return clasesDeDia(actuales, new Date());
  }, [materias.data]);

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
            onRefresh={() => void refrescar([['academico', 'materias'], ['comunicados']])}
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

        {/* ── Agenda de hoy: las clases del día, de agenda ── */}
        <View style={estilos.seccion}>
          <SectionHeader
            title="Tu agenda de hoy"
            action={
              <EnlaceSeccion
                etiqueta="Ver horario"
                descripcion="Ir a tus materias y horario"
                onPress={() => router.navigate('/academico')}
              />
            }
          />
          {materias.isPending ? (
            <CargandoSeccion />
          ) : clases.length === 0 ? (
            <EmptyState
              title={
                materias.isError ? 'No se pudo cargar tu horario' : 'No tienes clases hoy'
              }
              message={
                materias.isError
                  ? 'Revisa tu conexión e intenta de nuevo.'
                  : 'Disfruta tu día; tu horario aparecerá aquí cuando tengas clases.'
              }
            />
          ) : (
            <AgendaDia clases={clases} />
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
  seccion: { gap: spacing.lg },
  noticias: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  enlace: { color: colors.brand.primary },
  enlaceFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
