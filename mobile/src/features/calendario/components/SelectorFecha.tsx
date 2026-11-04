import { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { CalendarBlankIcon } from 'phosphor-react-native';

import { colors, radius, spacing, ThemedText, useSelectorWeb } from '@/shared/ui';

/**
 * Campo de fecha con picker nativo (iOS spinner / Android default) o input
 * web invisible superpuesto. Extraído de /eventos/nuevo para reuso por el
 * formulario de eventos de la consola de gestión.
 */
export function SelectorFecha({
  etiqueta,
  fecha,
  onChange,
}: {
  etiqueta: string;
  fecha: Date;
  onChange: (d: Date) => void;
}) {
  const [verFecha, setVerFecha] = useState(false);
  const esIos = Platform.OS === 'ios';
  const esWeb = Platform.OS === 'web';
  const selectorWeb = useSelectorWeb('date', fecha, onChange);

  return (
    <View style={estilos.campo}>
      <ThemedText variant="bodySm" tone="primary">
        {etiqueta}
      </ThemedText>
      <View style={estilos.contenedorSelector}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={etiqueta}
          onPress={() => (esWeb ? selectorWeb.abrir() : setVerFecha(true))}
          style={({ pressed }) => [estilos.cajaHora, pressed && { opacity: 0.85 }]}>
          <CalendarBlankIcon size={18} color={colors.text.secondary} />
          <ThemedText>
            {fecha.toLocaleDateString('es-VE', { dateStyle: 'medium' })}
          </ThemedText>
        </Pressable>
        {esWeb ? selectorWeb.superpuesto : null}
      </View>
      {!esWeb && verFecha ? (
        <DateTimePicker
          value={fecha}
          mode="date"
          display={esIos ? 'spinner' : 'default'}
          onChange={(e, nueva) => {
            if (!esIos) setVerFecha(false);
            if (nueva) {
              // conservar hora actual del estado
              const conservada = new Date(fecha);
              conservada.setFullYear(nueva.getFullYear());
              conservada.setMonth(nueva.getMonth());
              conservada.setDate(nueva.getDate());
              onChange(conservada);
            }
          }}
          testID="fecha-inicio"
        />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  campo: {
    gap: spacing.xs,
  },
  // Envuelve la caja táctil: ancla el input web invisible superpuesto.
  contenedorSelector: {
    position: 'relative',
  },
  cajaHora: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
});
