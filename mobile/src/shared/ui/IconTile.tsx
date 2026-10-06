import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, elevation, radius, spacing } from './theme';
import { ThemedText } from './ThemedText';

export interface IconTileProps {
  label: string;
  /** Componente de ícono (Phosphor en la práctica). */
  icono: React.ComponentType<{ size?: number; color?: string; weight?: 'regular' | 'fill' | 'duotone' }>;
  /** Sin destino aún → disabled visual (sin ripple, opacidad reducida). */
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Tile de acceso directo del Home: ícono en contenedor brand/surface-blue +
 * label caption, sin sombras pesadas (elevation.sm). Variante disabled
 * (decisión de alcance): sin interacción, opacidad 0.55.
 */
export function IconTile({ label, icono: Icono, disabled = false, onPress, style }: IconTileProps) {
  const contenido = (
    <>
      <View style={styles.iconoFondo}>
        <Icono size={24} color={colors.brand.primary} weight="duotone" />
      </View>
      <ThemedText variant="caption" tone={disabled ? 'tertiary' : 'primary'} numberOfLines={1}>
        {label}
      </ThemedText>
    </>
  );

  return (
    <View style={[styles.tile, disabled && styles.disabled, style]}>
      {disabled || !onPress ? (
        contenido
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={onPress}
          android_ripple={{ color: colors.brand.surfaceBlue, borderless: true }}
          style={styles.contenido}>
          {contenido}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.sm,
  },
  contenido: { alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.55 },
  iconoFondo: {
    width: 44,
    height: 44,
    borderRadius: radius.button,
    backgroundColor: colors.brand.surfaceBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
});
