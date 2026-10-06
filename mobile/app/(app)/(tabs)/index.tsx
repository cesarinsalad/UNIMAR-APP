import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import type { ComponentType } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BookBookmark,
  BookOpen,
  Clock,
  CreditCard,
  FileText,
  Users,
} from 'phosphor-react-native';

import { aplanarPaginas } from '@/shared/lib/paginar';
import { colors, layout, spacing } from '@/shared/ui';
import {
  EmptyState,
  IconTile,
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

/** Accesos directos: todos deshabilitados hasta que existan sus pantallas. */
const ACCESOS: { etiqueta: string; Icono: ComponentType<{ size?: number; color?: string; weight?: 'regular' | 'fill' | 'duotone' }> }[] = [
  { etiqueta: 'Académico', Icono: BookOpen },
  { etiqueta: 'Horarios', Icono: Clock },
  { etiqueta: 'Pagos', Icono: CreditCard },
  { etiqueta: 'Trámites', Icono: FileText },
  { etiqueta: 'Biblioteca', Icono: BookBookmark },
  { etiqueta: 'Directorio', Icono: Users },
];

const DIAS_VENTANA = 30;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const anchoTile = (width - 2 * spacing.lg - 2 * spacing.md) / 3;
  const [refrescando, setRefrescando] = useState(false);

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

  async function refrescar() {
    setRefrescando(true);
    try {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['academico', 'materias'] }),
        queryClient.refetchQueries({ queryKey: ['comunicados'] }),
        queryClient.refetchQueries({ queryKey: ['eventos'] }),
      ]);
    } finally {
      setRefrescando(false);
    }
  }

  return (
    <ThemedView variant="base" style={estilos.pantalla}>
      <ScrollView
        contentContainerStyle={[estilos.scroll, { paddingTop: insets.top + spacing.lg }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={() => void refrescar()} tintColor={colors.brand.primary} />
        }>
        {/* ── Sección 1: encabezado ── */}
        <View style={estilos.encabezado}>
          <ThemedText variant="title" weight="semibold" numberOfLines={1}>
            {`Bienvenido, ${primerNombre}!`}
          </ThemedText>
          <CampanaConBadge total={noLeidas.data?.total ?? 0} tono="claro" />
        </View>

        {/* ── Sección 2: próxima clase ── */}
        {materias.isPending ? (
          <Esperando />
        ) : (
          <ProximaClaseCard clase={clase} mensajeVacio={mensajeClase} />
        )}

        {/* ── Sección 3: accesos directos (todos deshabilitados por ahora) ── */}
        <View style={estilos.seccion}>
          <SectionHeader title="Accesos directos" />
          <View style={estilos.grilla}>
            {ACCESOS.map((acceso) => (
              <IconTile
                key={acceso.etiqueta}
                label={acceso.etiqueta}
                icono={acceso.Icono}
                disabled
                style={{ width: anchoTile }}
              />
            ))}
          </View>
        </View>

        {/* ── Sección 4: tus noticias ── */}
        <View style={estilos.seccion}>
          <SectionHeader
            title="Tus Noticias"
            action={
              <Pressable onPress={() => router.navigate('/comunicados')} hitSlop={8}>
                <ThemedText variant="bodySm" weight="semibold" style={estilos.enlace}>
                  Ver más →
                </ThemedText>
              </Pressable>
            }
          />
          {feed.isPending ? (
            <Esperando />
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

        {/* ── Sección 5: próximos eventos ── */}
        <View style={estilos.seccion}>
          <SectionHeader
            title="Tus Próximos Eventos"
            action={
              <Pressable onPress={() => router.navigate('/calendario')} hitSlop={8}>
                <ThemedText variant="bodySm" weight="semibold" style={estilos.enlace}>
                  Ver agenda →
                </ThemedText>
              </Pressable>
            }
          />
          {agenda.isPending ? (
            <Esperando />
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

/** Spinner azul centrado por sección (no bloquea el resto). */
function Esperando() {
  return (
    <View style={estilos.esperando}>
      <ActivityIndicator color={colors.brand.primary} />
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.bg.canvas },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: layout.bottomTabInset + spacing.lg,
    gap: spacing.xl,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seccion: { gap: spacing.md },
  grilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  noticias: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  listaEventos: { gap: spacing.md },
  enlace: { color: colors.brand.primary },
  vacio: { paddingVertical: spacing.md },
  esperando: { padding: spacing.xl, alignItems: 'center' },
});
