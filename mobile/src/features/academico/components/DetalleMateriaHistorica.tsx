import { StyleSheet, View } from 'react-native';

import { colors, elevation, highlight, spacing } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';
import { etiquetaEstadoHistorica } from '../helpers';
import { colorNotaClases } from './MateriaActualCard';
import { SelloUsoPersonal } from './SelloUsoPersonal';
import type { EstadoHistorica, MateriaHistoricaDTO } from '../types';

/**
 * Color del estado con el semáforo real, como TEXTO (sin chip): aprobada
 * en azul sello, reprobada en rojo, retirada en gris metadato.
 */
const COLOR_ESTADO: Record<EstadoHistorica, string> = {
  APROBADA: colors.brand.primary,
  REPROBADA: colors.status.danger,
  RETIRADA: colors.text.secondary,
};

/**
 * Variante histórica (`es_actual: false`): el mismo libro de registro del
 * acta en curso, en dos filas — "Nota final" con la cifra semaforizada y
 * "Estado" como texto color. Sin fileRule ni badge tintado: el documento
 * habla por sus filas; la sombra es la estándar de tarjeta al reposo.
 */
export function DetalleMateriaHistorica({ materia }: { materia: MateriaHistoricaDTO }) {
  return (
    <View style={estilos.bloque}>
      <ThemedView variant="card" style={estilos.tarjeta}>
        <View style={estilos.zonaTabla}>
          <View style={estilos.fila}>
            <ThemedText variant="body" weight="semibold">
              Nota final
            </ThemedText>
            <ThemedText
              variant="title"
              weight="bold"
              style={{ color: colorNotaClases(materia.nota_final) }}>
              {materia.nota_final === null
                ? '—'
                : Math.round(materia.nota_final).toString()}
            </ThemedText>
          </View>
          <View style={estilos.divisor} />
          <View style={estilos.fila}>
            <ThemedText variant="body" weight="semibold">
              Estado
            </ThemedText>
            <ThemedText
              variant="body"
              weight="semibold"
              style={{ color: COLOR_ESTADO[materia.estado] }}>
              {etiquetaEstadoHistorica(materia.estado)}
            </ThemedText>
          </View>
          <SelloUsoPersonal />
        </View>
      </ThemedView>
    </View>
  );
}

const estilos = StyleSheet.create({
  // Sombra de tarjeta al reposo (vocabulario de Card.tsx), sin fileRule.
  tarjeta: {
    ...elevation.sm,
    ...highlight.sm,
    gap: spacing.sm,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  // El sello de referencia se recorta aquí (nunca en la tarjeta con
  // sombra). Sin radios: el wrapper está 16px adentro de la tarjeta —
  // sus esquinas son interiores y el radio rozaba la cifra de la nota.
  zonaTabla: {
    overflow: 'hidden',
  },
  divisor: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
  },
  bloque: {
    gap: spacing.lg,
  },
});
