import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Bell } from 'phosphor-react-native';

import { colors, radius, spacing } from '@/shared/ui';

/**
 * Campana con punto naranja (accent/urgent) si hay no leídas; navega a la
 * bandeja (/notificaciones). Componente del módulo Notificaciones: lo
 * consumen el header de Perfil (vía tabs/_layout) y el Home.
 */
export function CampanaConBadge({
  total,
  tono = 'azul',
}: {
  total: number;
  /** 'azul': sobre fondo brand (icono blanco). 'claro': sobre superficie. */
  tono?: 'azul' | 'claro';
}) {
  const color = tono === 'azul' ? colors.text.onPrimary : colors.brand.primary;
  const puntoDerecha = tono === 'azul' ? spacing.lg : spacing.lg;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        total > 0 ? `Bandeja, ${total} notificaciones sin leer` : 'Bandeja de notificaciones'
      }
      onPress={() => router.push('/notificaciones')}
      hitSlop={8}
      style={styles.zona}>
      <Bell size={24} color={color} />
      {total > 0 ? (
        <View style={[styles.punto, { right: puntoDerecha, backgroundColor: colors.accent.urgent }]} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  zona: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  punto: {
    position: 'absolute',
    top: spacing.half,
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
});
