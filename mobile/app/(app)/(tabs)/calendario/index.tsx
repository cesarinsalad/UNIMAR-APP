import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  agruparPorDia,
  matrizMes,
  mesAnterior,
  mesSiguiente,
  tituloDia,
  ventanaMes,
  type GrupoDia,
} from '@/features/calendario/calendario-calculo';
import { aplanarPaginas } from '@/shared/lib/paginar';
import { useAgenda } from '@/features/calendario/hooks/useAgenda';
import { EventosDelDia } from '@/features/calendario/components/EventosDelDia';
import { GridMes } from '@/features/calendario/components/GridMes';
import { colors, spacing } from '@/shared/ui';
import { ThemedButton, ThemedText, ThemedView } from '@/shared/ui';

/**
 * Tab de calendario: grid mensual (lunes primero) + lista de eventos del
 * día seleccionado. La mezcla OFICIAL/PERSONAL la decide RLS en el BFF.
 */
export default function CalendarioScreen() {
  const hoy = useMemo(() => new Date(), []);
  const [posicion, setPosicion] = useState<[number, number]>([hoy.getFullYear(), hoy.getMonth()]);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);

  const ventana = useMemo(
    () => ventanaMes(posicion[0], posicion[1]),
    [posicion],
  );
  const agenda = useAgenda({ desde: ventana.desde, hasta: ventana.hasta, clave: ventana.clave });

  const matriz = useMemo(() => matrizMes(posicion[0], posicion[1], hoy), [posicion, hoy]);

  const eventosMes = aplanarPaginas(agenda.data?.pages);
  const grupos = useMemo(() => agruparPorDia(eventosMes), [eventosMes]);
  const conEventos = useMemo(() => new Set(grupos.map((g) => g.clave)), [grupos]);

  // Selección por defecto: hoy si está en este mes, si no el primer día.
  const seleccion = diaSeleccionado ?? diaInicialDeMatriz(matriz, hoy);

  function navegar(delta: -1 | 1) {
    const [y, m] = (delta === -1 ? mesAnterior : mesSiguiente)(posicion[0], posicion[1]);
    setPosicion([y, m]);
    setDiaSeleccionado(null);
  }

  return (
    <SafeAreaView style={estilos.safe}>
      <View style={estilos.contenido}>
        <View style={estilos.cabecera}>
          <Pressable onPress={() => navegar(-1)}>
            <ThemedText variant="subtitle" weight="semibold">
              ‹
            </ThemedText>
          </Pressable>
          <ThemedText variant="subtitle" weight="semibold">
            {ventana.etiqueta}
          </ThemedText>
          <Pressable onPress={() => navegar(1)}>
            <ThemedText variant="subtitle" weight="semibold">
              ›
            </ThemedText>
          </Pressable>
        </View>

        {agenda.isPending ? (
          <Centro>
            <ActivityIndicator color={colors.primary} />
          </Centro>
        ) : agenda.isError ? (
          <Centro gap>
            <ThemedText tone="secondary">No se pudo cargar la agenda.</ThemedText>
            <ThemedButton
              title="Reintentar"
              variant="secondary"
              size="sm"
              onPress={() => void agenda.refetch()}
            />
          </Centro>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <GridMes
              semanas={matriz}
              conEventos={conEventos}
              seleccionado={seleccion}
              onSeleccionar={setDiaSeleccionado}
            />

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
        )}
      </View>
    </SafeAreaView>
  );
}

/** Hoy si está en la matriz visible; si no, el primer día del mes. */
function diaInicialDeMatriz(matriz: ReturnType<typeof matrizMes>, _hoy: Date): string {
  const planas = matriz.flat();
  const deHoy = planas.find((c) => c.esHoy);
  return (deHoy ?? planas.find((c) => c.delMes) ?? planas[0])!.clave;
}

function eventosDelDia(grupos: GrupoDia[], clave: string) {
  return grupos.find((g) => g.clave === clave)?.eventos ?? [];
}

function Centro({
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
    backgroundColor: colors.background.base,
  },
  contenido: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.four,
    paddingVertical: spacing.three,
  },
  seccionDia: {
    marginTop: spacing.three,
    padding: spacing.four,
    gap: spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.six,
    gap: spacing.two,
  },
  centroConGap: {
    gap: spacing.four,
  },
  footer: {
    textAlign: 'center',
    paddingVertical: spacing.four,
  },
});
