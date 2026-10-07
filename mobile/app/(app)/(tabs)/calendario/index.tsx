import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CaretLeftIcon, CaretRightIcon, PlusIcon } from 'phosphor-react-native';

import {
  agruparPorDia,
  matrizMes,
  mesAnterior,
  mesSiguiente,
  tituloDia,
  ventanaMes,
  claveDia,
  type GrupoDia,
  type TipoPunto,
} from '@/features/calendario/calendario-calculo';
import { aplanarPaginas } from '@/shared/lib/paginar';
import { useAgenda } from '@/features/calendario/hooks/useAgenda';
import { EventosDelDia } from '@/features/calendario/components/EventosDelDia';
import { GridMes } from '@/features/calendario/components/GridMes';
import { TarjetaProximoEvento } from '@/features/calendario/components/TarjetaProximoEvento';
import { colors, layout, spacing } from '@/shared/ui';
import {
  Card,
  EmptyState,
  SectionHeader,
  ThemedButton,
  ThemedText,
  ThemedView,
} from '@/shared/ui';
import { CampanaConBadge } from '@/features/notificaciones/components/CampanaConBadge';
import { useNoLeidas } from '@/features/notificaciones/hooks/useNoLeidas';

/**
 * Tab Agenda estilo mock: header con campana, selector de mes con botón de
 * crear, grid mensual con puntos por tipo (azul OFICIAL / naranja PERSONAL)
 * + leyenda, "Próximos eventos" y eventos del día seleccionado. La mezcla
 * OFICIAL/PERSONAL la decide RLS en el BFF.
 */
export default function CalendarioScreen() {
  const hoy = useMemo(() => new Date(), []);
  const noLeidas = useNoLeidas();
  const [posicion, setPosicion] = useState<[number, number]>([hoy.getFullYear(), hoy.getMonth()]);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);

  const ventana = useMemo(() => ventanaMes(posicion[0], posicion[1]), [posicion]);
  const agenda = useAgenda({ desde: ventana.desde, hasta: ventana.hasta, clave: ventana.clave });

  const matriz = useMemo(() => matrizMes(posicion[0], posicion[1], hoy), [posicion, hoy]);

  const eventosMes = aplanarPaginas(agenda.data?.pages);
  const grupos = useMemo(() => agruparPorDia(eventosMes), [eventosMes]);

  const puntos = useMemo(() => {
    const mapa = new Map<string, TipoPunto>();
    for (const grupo of grupos) {
      const tipo: TipoPunto = todosOficial(grupo) ? 'OFICIAL' : 'PERSONAL';
      mapa.set(grupo.clave, tipo);
    }
    return mapa;
  }, [grupos]);

  const proximos = useMemo(() => {
    const claveHoy = claveDia(hoy);
    return grupos.filter((g) => g.clave >= claveHoy);
  }, [grupos, hoy]);

  // Selección por defecto: hoy si está en este mes, si no el primer día.
  const seleccion = diaSeleccionado ?? diaInicialDeMatriz(matriz, hoy);

  function navegar(delta: -1 | 1) {
    const [y, m] = (delta === -1 ? mesAnterior : mesSiguiente)(posicion[0], posicion[1]);
    setPosicion([y, m]);
    setDiaSeleccionado(null);
  }

  return (
    <SafeAreaView style={estilos.safe}>
      <ScrollView
        contentContainerStyle={estilos.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={agenda.isRefetching}
            onRefresh={() => {
              void agenda.refetch();
            }}
            colors={[colors.brand.primary]}
            tintColor={colors.brand.primary}
          />
        }>
        <View style={estilos.cabecera}>
          <ThemedText variant="headline" weight="semibold">
            Agenda
          </ThemedText>
          <CampanaConBadge total={noLeidas.data?.total ?? 0} tono="claro" />
        </View>

        <View style={estilos.filaMes}>
          <View style={estilos.espacioSimetrico} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mes anterior"
            onPress={() => navegar(-1)}>
            <CaretLeftIcon size={22} color={colors.brand.primary} />
          </Pressable>
          <ThemedText variant="subtitle" weight="semibold" style={estilos.etiquetaMes}>
            {etiquetaMes(ventana.etiqueta)}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Siguiente mes"
            onPress={() => navegar(1)}>
            <CaretRightIcon size={22} color={colors.brand.primary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Agregar evento"
            onPress={() => router.push('/eventos/nuevo')}>
            <PlusIcon size={24} color={colors.brand.primary} weight="bold" />
          </Pressable>
        </View>

        <Card style={estilos.tarjetaCalendario} paddingV="md">
          <GridMes
            semanas={matriz}
            puntos={puntos}
            seleccionado={seleccion}
            onSeleccionar={setDiaSeleccionado}
          />
          <View style={estilos.leyenda}>
            <ItemLeyenda color={colors.brand.primary} etiqueta="Eventos UNIMAR" />
            <ItemLeyenda color={colors.accent.urgent} etiqueta="Personales" />
          </View>
        </Card>

        <SectionHeader title="Próximos eventos" style={estilos.seccionProximos} />
        {agenda.isPending ? (
          <Centrado>
            <ActivityIndicator color={colors.brand.primary} />
          </Centrado>
        ) : agenda.isError ? (
          <Centrado gap>
            <ThemedText tone="secondary">No se pudo cargar la agenda.</ThemedText>
            <ThemedButton
              title="Reintentar"
              variant="secondary"
              size="sm"
              onPress={() => void agenda.refetch()}
            />
          </Centrado>
        ) : proximos.length > 0 ? (
          <View style={estilos.listaProximos}>
            {proximos.map((grupo: GrupoDia) =>
              grupo.eventos.map((evento) => (
                <TarjetaProximoEvento key={evento.id} evento={evento} />
              )),
            )}
          </View>
        ) : (
          <EmptyState
            title="Sin próximos eventos"
            message="Los eventos de este mes aparecerán aquí."
          />
        )}

        <ThemedView variant="base" style={estilos.seccionDia}>
          <ThemedText variant="bodyLg" weight="semibold">
            {tituloDia(seleccion)}
          </ThemedText>
          <EventosDelDia eventos={eventosDelDia(grupos, seleccion)} />
        </ThemedView>

        {agenda.isFetchingNextPage ? (
          <ThemedText variant="caption" tone="tertiary" style={estilos.footer}>
            Cargando más...
          </ThemedText>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function todosOficial(grupo: GrupoDia): boolean {
  return grupo.eventos.every((e) => e.tipo === 'OFICIAL');
}

/** "septiembre de 2026" → "Septiembre 2026" (estilo del mock). */
function etiquetaMes(etiqueta: string): string {
  return etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1).replace(' de ', ' ');
}

/** Hoy si está en la matriz visible; si no, el primer día del mes. */
function diaInicialDeMatriz(
  matriz: ReturnType<typeof matrizMes>,
  _hoy: Date,
): string {
  const planas = matriz.flat();
  const deHoy = planas.find((c) => c.esHoy);
  return (deHoy ?? planas.find((c) => c.delMes) ?? planas[0])!.clave;
}

function eventosDelDia(grupos: GrupoDia[], clave: string) {
  return grupos.find((g) => g.clave === clave)?.eventos ?? [];
}

function ItemLeyenda({ color, etiqueta }: { color: string; etiqueta: string }) {
  return (
    <View style={estilos.itemLeyenda}>
      <View style={[estilos.puntoLeyenda, { backgroundColor: color }]} />
      <ThemedText variant="caption" tone="secondary">
        {etiqueta}
      </ThemedText>
    </View>
  );
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
  safe: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  scroll: {
    paddingVertical: spacing.lg,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: layout.bottomTabInset * 1.5,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  filaMes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  etiquetaMes: {
    flex: 1,
    textAlign: 'center',
  },
  espacioSimetrico: {
    // Iguala el peso óptico del lado izquierdo (chevron izquierdo) con el
    // derecho (chevron + botón +), para que el rótulo del mes quede centrado.
    width: 36,
  },
  tarjetaCalendario: {
    gap: spacing.sm,
  },
  leyenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  itemLeyenda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  puntoLeyenda: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  seccionProximos: {
    marginTop: spacing.xl,
  },
  listaProximos: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  seccionDia: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  centro: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  centroConGap: {
    gap: spacing.lg,
  },
  footer: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
