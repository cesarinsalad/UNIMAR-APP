import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';
import { etiquetaEstadoHistorica } from '../helpers';
import { colorNotaClases } from './MateriaActualCard';
import type { EstadoHistorica, MateriaHistoricaDTO } from '../types';

/**
 * Tono del badge de estado con el semáforo real: aprobada en tinte azul,
 * reprobada en tinte rojo, retirada en gris (colors.status / brand /
 * background sunken — sin hex fuera de theme.ts).
 */
const TONO_ESTADO: Record<EstadoHistorica, { fondo: string; texto: string }> = {
  APROBADA: { fondo: colors.brand.surfaceBlue, texto: colors.brand.primary },
  REPROBADA: { fondo: `${colors.status.danger}1A`, texto: colors.status.danger },
  RETIRADA: { fondo: colors.background.sunken, texto: colors.text.secondary },
};

/**
 * Variante histórica (`es_actual: false`): documento con estado — fileRule
 * color-estado (la firma de "esto es un documento con estado"), nota final
 * grande con semáforo real y badge tintado por estado.
 */
export function DetalleMateriaHistorica({ materia }: { materia: MateriaHistoricaDTO }) {
  const tono = TONO_ESTADO[materia.estado];

  return (
    <View style={estilos.bloque}>
      <ThemedView variant="card" style={estilos.tarjeta}>
        <View
          style={[estilos.fileRule, { backgroundColor: tono.texto }]}
        />

        <View style={estilos.cabecera}>
          <View style={estilos.bloqueNota}>
            <ThemedText variant="caption" tone="secondary">
              Nota final
            </ThemedText>
            <ThemedText
              variant="headline"
              weight="bold"
              style={{ color: colorNotaClases(materia.nota_final) }}>
              {materia.nota_final === null
                ? '—'
                : Math.round(materia.nota_final).toString()}
            </ThemedText>
          </View>
          <View style={[estilos.badge, { backgroundColor: tono.fondo }]}>
            <ThemedText
              variant="caption"
              weight="semibold"
              style={{ color: tono.texto }}>
              {etiquetaEstadoHistorica(materia.estado)}
            </ThemedText>
          </View>
        </View>
      </ThemedView>
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: {
    gap: spacing.lg,
  },
  tarjeta: {
    gap: spacing.md,
    overflow: 'hidden',
  },
  fileRule: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
  },
  cabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  bloqueNota: {
    gap: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
});
