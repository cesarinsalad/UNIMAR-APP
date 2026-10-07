import { Pressable, StyleSheet, View } from 'react-native';

import { colors, elevation, radius, spacing } from './theme';

/**
 * Botón circular blanco con elevación (back/share) flotante sobre el
 * contenido; el hijo suele ser un icono Phosphor. Se extrae a shared para
 * reuso (detalle de evento, nuevo evento, comunicados).
 */
export function BotonCircular({
  onPress,
  label,
  children,
  style,
}: {
  onPress: () => void;
  label: string;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.circulo, elevation.sm, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        hitSlop={8}
        style={({ pressed }) => [styles.zona, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  circulo: {
    borderRadius: radius.pill,
    backgroundColor: colors.bg.surface,
    overflow: 'hidden',
  },
  zona: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xs / 2,
  },
});
