import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CaretDownIcon } from 'phosphor-react-native';

import { colors, radius, spacing } from '@/shared/ui';import { ThemedText, ThemedView } from '@/shared/ui';
import { formatearPeriodo } from '../helpers';

/**
 * Select de período del historial académico (fila expandible con opciones).
 * `activo === null` significa "filtrando todo el historial": la etiqueta
 * muestra "Todos" en vez de inventar un período.
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

  return (
    <ThemedView variant="card" style={estilos.contenedor}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Selector de período académico"
        style={estilos.fila}
        onPress={() => setAbierto((v) => !v)}>
        <ThemedText variant="bodySm" tone="secondary">
          Período académico
        </ThemedText>
        <View style={estilos.valor}>
          <ThemedText variant="bodySm" weight="semibold">
            {activo === null ? 'Todos' : formatearPeriodo(activo)}
          </ThemedText>
          <CaretDownIcon
            size={14}
            color={colors.text.secondary}
            style={abierto ? estilos.caretAbierto : null}
          />
        </View>
      </Pressable>
      {abierto ? (
        <View style={estilos.opciones}>
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
        </View>
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
    <Pressable accessibilityRole="button" style={estilos.opcion} onPress={onSelect}>
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
