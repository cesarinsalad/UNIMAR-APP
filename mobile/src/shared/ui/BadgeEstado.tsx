import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PALETA_ESTADO_PUBLICACION, radius, spacing, type EstadoPublicacionVisual } from './theme';
import { ThemedText } from './ThemedText';

export interface BadgeEstadoProps {
  estado: EstadoPublicacionVisual;
  style?: StyleProp<ViewStyle>;
}

/**
 * Badge semántico del estado de publicación (consola de gestión): pill con
 * los triplets texto/fondo/borde de PALETA_ESTADO_PUBLICACION (contraste
 * AA). Distinto de `Badge` (tonos info/urgent de estado de UI): este ma-
 * terializa el estado del CICLO EDITORIAL — Publicado verde, En revisión
 * azul institucional, Borrador ámbar, Devuelto rojo, Archivado slate.
 */
export function BadgeEstado({ estado, style }: BadgeEstadoProps) {
  const paleta = PALETA_ESTADO_PUBLICACION[estado];
  return (
    <View
      style={[
        styles.base,
        { backgroundColor: paleta.bgLight, borderColor: paleta.border },
        style,
      ]}>
      <ThemedText variant="caption" weight="semibold" style={{ color: paleta.color }}>
        {paleta.nombre}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
});
