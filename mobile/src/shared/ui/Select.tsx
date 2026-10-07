import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { CaretDownIcon, CheckIcon } from 'phosphor-react-native';

import { colors, radius, spacing } from './theme';
import { ThemedText } from './ThemedText';

export interface OpcionSelect<T extends string | number | null> {
  valor: T;
  etiqueta: string;
}

export interface SelectProps<T extends string | number | null> {
  /** Valor actual; undefined = sin selección (muestra el placeholder). */
  valor?: T;
  opciones: OpcionSelect<T>[];
  onChange: (valor: T) => void;
  placeholder?: string;
}

/**
 * Select estilo mock: fila blanca con caret que abre un bottom-sheet
 * (Modal de RN core, sin dependencias nuevas) con la lista de opciones;
 * la vigente va en semibold con el check. Genérico para reuso
 * (Alerta de recordatorio y selects futuros).
 */
export function Select<T extends string | number | null>({
  valor,
  opciones,
  onChange,
  placeholder = 'Seleccionar…',
}: SelectProps<T>) {
  const [abierto, setAbierto] = useState(false);
  const actual = opciones.find((o) => o.valor === valor);

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actual?.etiqueta ?? placeholder}
        onPress={() => setAbierto(true)}
        style={({ pressed }) => [estilos.fila, pressed && stylesPress]}>
        <ThemedText variant="body">{actual?.etiqueta ?? placeholder}</ThemedText>
        <CaretDownIcon size={16} color={colors.text.secondary} />
      </Pressable>

      <Modal
        transparent
        visible={abierto}
        animationType="slide"
        onRequestClose={() => setAbierto(false)}>
        <Pressable
          accessibilityLabel="Cerrar selector"
          style={estilos.cortina}
          onPress={() => setAbierto(false)}>
          <Pressable style={estilos.hoja}>
            {opciones.map((opcion, indice) => (
              <View key={String(opcion.valor)}>
                {indice > 0 ? <View style={estilos.divisor} /> : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={opcion.etiqueta}
                  style={estilos.opcion}
                  onPress={() => {
                    onChange(opcion.valor);
                    setAbierto(false);
                  }}>
                  <ThemedText
                    variant="body"
                    weight={opcion.valor === valor ? 'semibold' : 'regular'}>
                    {opcion.etiqueta}
                  </ThemedText>
                  {opcion.valor === valor ? (
                    <CheckIcon size={18} color={colors.brand.primary} weight="bold" />
                  ) : null}
                </Pressable>
              </View>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const stylesPress = { opacity: 0.85 };

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  pressed: { opacity: 0.85 },
  cortina: {
    flex: 1,
    backgroundColor: `${colors.bg.canvas}E6`,
    justifyContent: 'flex-end',
  },
  hoja: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing.xl,
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  divisor: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
  },
});
