import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { BellIcon } from 'phosphor-react-native';

import { colors, radius, spacing, typography, fontFamily } from '@/shared/ui';
import { ThemedText } from '@/shared/ui';
import { formatearBadge } from '../hooks/badge';

/**
 * Campana con badge naranja si hay no leídas; navega a la bandeja
 * (/notificaciones). Componente del módulo Notificaciones: lo consumen
 * los headers de las tabs (vía HeaderTab action) y el header nativo.
 * Badge = cifra en pill ("9+"/"99+") — triage real. El naranja es SU
 * territorio único en la app (Regla Naranja Exclusiva de DESIGN.md).
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        total > 0 ? `Bandeja, ${total} notificaciones sin leer` : 'Bandeja de notificaciones'
      }
      onPress={() => router.push('/notificaciones')}
      hitSlop={8}
      style={estilos.zona}>
      <BellIcon size={24} color={color} weight="bold" />
      {total > 0 ? (
        <View style={estilos.pill}>
          <ThemedText
            variant="caption"
            weight="bold"
            style={estilos.cifraBadge}>
            {formatearBadge(total)}
          </ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  zona: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  pill: {
    position: 'absolute',
    top: 0,
    right: spacing.xs,
    backgroundColor: colors.accent.urgent,
    borderRadius: radius.pill,
    minWidth: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs / 2,
    borderWidth: 2,
    borderColor: colors.bg.canvas,
  },
  cifraBadge: {
    color: colors.text.onPrimary,
    fontFamily: fontFamily.bold,
    fontSize: 10,
    lineHeight: typography.size.caption,
  },
});

