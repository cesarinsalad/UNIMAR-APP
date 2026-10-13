import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { CaretDownIcon } from 'phosphor-react-native';

import { colors, radius, spacing } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';
import { formatearPeriodo } from '../helpers';

/**
 * Select de período del historial académico (fila expandible con opciones).
 * `activo === null` significa "filtrando todo el historial": la etiqueta
 * muestra "Todos" en vez de inventar un período. El caret rota 180° en
 * 150ms y las opciones entran con un fade sutil (respetando motion
 * reducido: sin transición, el estado llega igual).
 */
export function SelectorPeriodo({
  periodos,
  activo,
  onSeleccionar,
}: {
  periodos: string[];
  activo: string | null;
  onSeleccionar: (periodo: string | null) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const reducido = useReducedMotion();

  return (
    <ThemedView variant="card" style={estilos.contenedor}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Selector de período académico"
        accessibilityState={{ expanded: abierto }}
        style={({ pressed }) => [estilos.fila, pressed && { opacity: 0.85 }]}
        onPress={() => setAbierto((v) => !v)}>
        <ThemedText variant="bodySm" tone="secondary">
          Período académico
        </ThemedText>
        <View style={estilos.valor}>
          <ThemedText variant="bodySm" weight="semibold">
            {activo === null ? 'Todos' : formatearPeriodo(activo)}
          </ThemedText>
          <Animated.View
            style={[
              estilos.caret,
              !reducido && estilos.transicionCaret,
              abierto && estilos.caretAbierto,
            ]}>
            <CaretDownIcon size={14} color={colors.text.secondary} />
          </Animated.View>
        </View>
      </Pressable>
      {abierto ? (
        <Animated.View entering={reducido ? undefined : FadeIn.duration(120)} style={estilos.opciones}>
          <Opcion
            etiqueta="Todos"
            seleccion={activo === null}
            onSelect={() => {
              onSeleccionar(null);
              setAbierto(false);
            }}
          />
          {periodos.map((periodo) => (
            <Fragment key={periodo}>
              <View style={estilos.divisor} />
              <Opcion
                etiqueta={formatearPeriodo(periodo)}
                seleccion={activo === periodo}
                onSelect={() => {
                  onSeleccionar(periodo);
                  setAbierto(false);
                }}
              />
            </Fragment>
          ))}
        </Animated.View>
      ) : null}
    </ThemedView>
  );
}

function Opcion({
  etiqueta,
  seleccion,
  onSelect,
}: {
  etiqueta: string;
  seleccion: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: seleccion }}
      style={({ pressed }) => [estilos.opcion, pressed && { opacity: 0.85 }]}
      onPress={onSelect}>
      <ThemedText variant="bodySm" weight={seleccion ? 'semibold' : 'regular'}>
        {etiqueta}
      </ThemedText>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    borderRadius: radius.input,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  valor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  caret: {
    transform: [{ rotate: '0deg' }],
  },
  transicionCaret: {
    transitionProperty: 'transform',
    transitionDuration: '150ms',
    transitionTimingFunction: 'ease-in-out',
  },
  caretAbierto: {
    transform: [{ rotate: '180deg' }],
  },
  opciones: {
    paddingBottom: spacing.xs,
  },
  opcion: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  divisor: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
  },
});
