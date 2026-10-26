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
  compacto = false,
  tamano = 24,
  peso = 'regular',
}: {
  total: number;
  /** 'azul': sobre fondo brand (icono blanco). 'claro': sobre superficie. */
  tono?: 'azul' | 'claro';
  /** Sin padding horizontal, centrado en 44px (uso en BarraInstitucional). */
  compacto?: boolean;
  /** Tamaño del icono Phosphor (default 24). */
  tamano?: number;
  /** Peso del trazo Phosphor (default regular — casa con los iconos del nav bar). */
  peso?: 'regular' | 'bold';
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
      style={compacto ? estilos.zonaCompacta : estilos.zona}>
      <BellIcon size={tamano} color={color} weight={peso} />
      {total > 0 ? (
        <View style={compacto ? estilos.pillCompacta : estilos.pill}>
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

const pillBase = {
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
} as const;

const estilos = StyleSheet.create({
  zona: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  zonaCompacta: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    ...pillBase,
  },
  /** Ancla el badge a la esquina del icono compacto (zona 44px, icono 20). */
  pillCompacta: {
    ...pillBase,
    top: 8,
    right: 9,
  },
  cifraBadge: {
    color: colors.text.onPrimary,
    fontFamily: fontFamily.bold,
    fontSize: 10,
    lineHeight: typography.size.caption,
  },
});

