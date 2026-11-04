import { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { ClockIcon } from 'phosphor-react-native';

import { colors, radius, spacing, ThemedText, useSelectorWeb } from '@/shared/ui';

/**
 * Columna de hora con picker nativo (o input web invisible superpuesto).
 * Extraída de /eventos/nuevo para reuso por el formulario de eventos de la
 * consola de gestión.
 */
export function SelectorHora({
  etiqueta,
  valor,
  disabled,
  idPrueba,
  onChange,
}: {
  etiqueta: string;
  valor: Date;
  disabled?: boolean;
  idPrueba: string;
  onChange: (d: Date) => void;
}) {
  const [verHora, setVerHora] = useState(false);
  const esIos = Platform.OS === 'ios';
  const esWeb = Platform.OS === 'web';
  const selectorWeb = useSelectorWeb('time', valor, onChange);

  return (
    <View style={estilos.columnaHora}>
      <ThemedText variant="bodySm" tone="secondary">
        {etiqueta}
      </ThemedText>
      <View style={estilos.contenedorSelector}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={etiqueta}
          disabled={disabled}
          onPress={() => (esWeb ? selectorWeb.abrir() : setVerHora(true))}
          style={({ pressed }) => [estilos.cajaHora, pressed && { opacity: 0.85 }]}>
          <ClockIcon size={18} color={colors.text.secondary} />
          <ThemedText>
            {valor.toLocaleTimeString('es-VE', { timeStyle: 'short' })}
          </ThemedText>
        </Pressable>
        {esWeb ? selectorWeb.superpuesto : null}
      </View>
      {!esWeb && verHora ? (
        <DateTimePicker
          value={valor}
          mode="time"
          display={esIos ? 'spinner' : 'default'}
          onChange={(e, nueva) => {
            if (!esIos) setVerHora(false);
            if (nueva) {
              const conservada = new Date(valor);
              conservada.setHours(nueva.getHours());
              conservada.setMinutes(nueva.getMinutes());
              onChange(conservada);
            }
          }}
          testID={idPrueba}
        />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  columnaHora: {
    flex: 1,
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
