import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
} from '@/features/calendario/calendario-calculo';
import {
  clasificarEventoVisual,
  ORDEN_PUNTOS,
} from '@/features/calendario/colores-evento';
import { aplanarPaginas } from '@/shared/lib/paginar';
import { useAgenda } from '@/features/calendario/hooks/useAgenda';
import { EventosDelDia } from '@/features/calendario/components/EventosDelDia';
import { GridMes, type InfoDia } from '@/features/calendario/components/GridMes';
import { TarjetaProximoEvento } from '@/features/calendario/components/TarjetaProximoEvento';
import { colors, layout, radius, spacing } from '@/shared/ui';
import {
  Card,
  EmptyState,
  HeaderTab,
  PALETA_CALENDARIO_UNIMAR,
  PressableScale,
  SectionHeader,
  ThemedButton,
  ThemedText,
  ThemedView,
} from '@/shared/ui';

/**
 * Tab Agenda con la voz del calendario académico institucional: header de
 * impacto (badge azul del número de mes + nombre en mayúsculas), cápsula
 * gris del membrete semanal y grid infográfico donde el DATO vive en PUNTOS
 * de color (uno por naturaleza presente: institucional/campus/decanato/
 * feriado/personal — clasificación visual en colores-evento.ts) y la ACCIÓN
 * en el anillo de selección. Agenda opt-in: tus PERSONAL + los OFICIALES
 * que agregaste desde la pantalla de eventos + INSTITUCIONAL/FERIADO.
 */
export default function CalendarioScreen() {
  const insets = useSafeAreaInsets();
  const hoy = useMemo(() => new Date(), []);
  const [posicion, setPosicion] = useState<[number, number]>([hoy.getFullYear(), hoy.getMonth()]);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);

  const ventana = useMemo(() => ventanaMes(posicion[0], posicion[1]), [posicion]);
  const agenda = useAgenda({ desde: ventana.desde, hasta: ventana.hasta, clave: ventana.clave });

  const matriz = useMemo(() => matrizMes(posicion[0], posicion[1], hoy), [posicion, hoy]);

  const eventosMes = aplanarPaginas(agenda.data?.pages);
  const grupos = useMemo(() => agruparPorDia(eventosMes), [eventosMes]);

  const puntos = useMemo(() => {
    const mapa = new Map<string, InfoDia>();
    for (const grupo of grupos) {
      // Naturalezas visuales presentes ese día, sin repetir y en el orden
      // canónico de la paleta: un punto de color por tipo en el grid.
      const presentes = new Set(grupo.eventos.map(clasificarEventoVisual));
      const tipos = ORDEN_PUNTOS.filter((t) => presentes.has(t));
      mapa.set(grupo.clave, { tipos, cantidad: grupo.eventos.length });
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
    // View plano (no SafeAreaView): el inset superior es de la
    // BarraInstitucional fuera del Stack — SafeAreaView lo duplicaría
    // como franja canvas fija bajo la barra azul. El inferior se suma
    // manual al scroll como en el resto de las tabs.
    <View style={estilos.safe}>
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
            refreshing={agenda.isRefetching}
            onRefresh={() => {
              void agenda.refetch();
            }}
            colors={[colors.brand.primary]}
            tintColor={colors.brand.primary}
          />
        }>
        <HeaderTab
          titulo="Agenda"
        />

        <View style={estilos.cabeceraMes}>
          <View style={estilos.identidadMes}>
            <View style={estilos.badgeMes}>
              <ThemedText variant="subtitle" weight="semibold" style={estilos.textoBadgeMes}>
                {String(posicion[1] + 1).padStart(2, '0')}
              </ThemedText>
            </View>
            <View>
              <ThemedText variant="title" weight="semibold" style={estilos.nombreMes}>
                {nombreMes(posicion[0], posicion[1])}
              </ThemedText>
              <ThemedText variant="caption" tone="secondary">
                {posicion[0]}
              </ThemedText>
            </View>
          </View>
          <View style={estilos.navegacionMes}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Mes anterior"
              hitSlop={12}
              onPress={() => navegar(-1)}>
              <CaretLeftIcon size={22} color={colors.brand.primary} />
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Siguiente mes"
              hitSlop={12}
              onPress={() => navegar(1)}>
              <CaretRightIcon size={22} color={colors.brand.primary} />
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Agregar evento"
              hitSlop={12}
              onPress={() => router.push('/eventos/nuevo')}>
              <PlusIcon size={24} color={colors.brand.primary} weight="bold" />
            </PressableScale>
          </View>
        </View>

        <Card style={estilos.tarjetaCalendario} paddingV="md">
          <GridMes
            semanas={matriz}
            puntos={puntos}
            seleccionado={seleccion}
            onSeleccionar={setDiaSeleccionado}
          />
          <View style={estilos.leyenda}>
            {(Object.keys(PALETA_CALENDARIO_UNIMAR) as (keyof typeof PALETA_CALENDARIO_UNIMAR)[]).map(
              (tipo) => (
                <ItemLeyenda
                  key={tipo}
                  color={PALETA_CALENDARIO_UNIMAR[tipo].color}
                  etiqueta={PALETA_CALENDARIO_UNIMAR[tipo].nombre}
                />
              ),
            )}
          </View>
        </Card>

        <Card style={estilos.seccionDia} paddingV="md">
          <ThemedText variant="body" weight="semibold">
            {tituloDia(seleccion)}
          </ThemedText>
          <EventosDelDia eventos={eventosDelDia(grupos, seleccion)} />
        </Card>

        <SectionHeader
          title="Próximos eventos"
          action={
            <PressableScale
              accessibilityRole="link"
              accessibilityLabel="Explorar eventos del campus"
              hitSlop={12}
              onPress={() => router.push('/eventos/listado')}>
              <ThemedText variant="bodySm" weight="semibold" style={estilos.enlaceSeccion}>
                Explorar campus
              </ThemedText>
            </PressableScale>
          }
          style={estilos.seccionProximos}
        />
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
            message="Tus eventos personales, los oficiales que agregues y las fechas institucionales aparecerán aquí."
          />
        )}

        {agenda.isFetchingNextPage ? (
          <ThemedText variant="caption" tone="tertiary" style={estilos.footer}>
            Cargando más...
          </ThemedText>
        ) : null}
      </ScrollView>
    </View>
  );
}

/** Nombre del mes es-VE para el rótulo en mayúsculas del header. */
function nombreMes(year: number, mesLocal: number): string {
  return new Date(year, mesLocal, 1)
    .toLocaleDateString('es-VE', { month: 'long' })
    .toUpperCase();
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
    <View
      style={estilos.itemLeyenda}
      accessible
      accessibilityLabel={`${etiqueta}: punto ${etiqueta.toLowerCase()}`}>
      <View style={[estilos.muestraLeyenda, { backgroundColor: color }]} />
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
  },
  cabeceraMes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    // Respiro entre el "Agenda" del HeaderTab y la fila del mes: sin él
    // el headline y el badge quedan amontonados.
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  identidadMes: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  badgeMes: {
    width: 44,
    height: 44,
    borderRadius: radius.button,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBadgeMes: {
    color: colors.text.onPrimary,
  },
  nombreMes: {
    color: colors.brand.primary,
    letterSpacing: 0.5,
  },
  navegacionMes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
  muestraLeyenda: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  seccionProximos: {
    marginTop: spacing.xl,
  },
  enlaceSeccion: {
    color: colors.brand.primary,
  },
  listaProximos: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  seccionDia: {
    marginTop: spacing.xl,
    gap: spacing.md,
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
