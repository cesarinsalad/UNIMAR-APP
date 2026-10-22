import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, radius, spacing } from '@/shared/ui';
import { Card, PressableScale, ThemedText } from '@/shared/ui';
import type { ClaseDia } from '../clases-de-dia';

export interface AgendaDiaProps {
  clases: ClaseDia[];
}

/** "HH:MM" 24h local desde la ventana construida sobre la fecha base. */
function hhmm(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Agenda del día del Home: UNA tarjeta blanca (naturaleza lista) con las
 * clases de hoy ordenadas por hora, separadas por hairline. Firma del
 * documento: espina lateral 3px azul solo para la clase en curso, track
 * sutil para el resto; clases pasadas atenuadas por color (sin tachado).
 */
export function AgendaDia({ clases }: AgendaDiaProps) {
  const router = useRouter();

  return (
    <Card paddingH="lg" paddingV="sm">
      {clases.map((clase, i) => {
        const { materia, estado } = clase;
        const enCurso = estado === 'enCurso';
        const pasada = estado === 'pasada';
        const tonoHora = enCurso
          ? colors.brand.primary
          : pasada
            ? colors.text.secondary
            : colors.text.primary;
        const tonoNombre = pasada ? 'secondary' : ('primary' as const);
        const meta = [clase.aula ? `Aula ${clase.aula}` : null, materia.profesor]
          .filter(Boolean)
          .join(' · ');

        return (
          <View key={materia.id}>
            {i > 0 ? <View style={estilos.divisor} /> : null}
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`${materia.nombre}, ${hhmm(clase.inicio)} a ${hhmm(clase.fin)}${clase.aula ? `, aula ${clase.aula}` : ''}${enCurso ? ', en curso' : ''}`}
              onPress={() => router.push(`/academico/materias/${materia.id}`)}>
              <View style={estilos.fila}>
                <View
                  style={[
                    estilos.espina,
                    enCurso ? estilos.espinaActiva : null,
                  ]}
                />
                <View style={estilos.hora}>
                  <ThemedText
                    variant="bodySm"
                    weight="semibold"
                    style={{ color: tonoHora }}>
                    {hhmm(clase.inicio)}
                  </ThemedText>
                  <ThemedText variant="caption" tone="secondary">
                    {hhmm(clase.fin)}
                  </ThemedText>
                </View>
                <View style={estilos.info}>
                  <ThemedText
                    variant="bodySm"
                    weight="medium"
                    tone={tonoNombre}
                    numberOfLines={1}>
                    {materia.nombre}
                  </ThemedText>
                  {meta ? (
                    <ThemedText variant="caption" tone="secondary" numberOfLines={1}>
                      {meta}
                    </ThemedText>
                  ) : null}
                </View>
                {enCurso ? (
                  <View style={estilos.ahora}>
                    <ThemedText
                      variant="caption"
                      weight="semibold"
                      style={estilos.ahoraTexto}>
                      Ahora
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            </PressableScale>
          </View>
        );
      })}
    </Card>
  );
}

const estilos = StyleSheet.create({
  divisor: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
    marginHorizontal: -spacing.sm,
  },
  fila: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  espina: {
    width: 3,
    borderRadius: radius.pill,
    alignSelf: 'stretch',
    backgroundColor: colors.border.subtle,
  },
  espinaActiva: { backgroundColor: colors.brand.primary },
  /**
   * La espina vive en el gutter izquierdo de la tarjeta: la fila la
   * respira con padding, no con separación inter-columna dura.
   */
  hora: {
    width: 52,
    marginLeft: spacing.md,
    gap: spacing.half,
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
    gap: 2,
  },
  ahora: {
    marginLeft: spacing.md,
    backgroundColor: colors.brand.surfaceBlue,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  ahoraTexto: { color: colors.brand.primary },
});
