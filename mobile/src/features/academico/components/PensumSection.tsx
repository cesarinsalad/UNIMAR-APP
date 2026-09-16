import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';
import type { GrupoTrimestre } from '../helpers';

/**
 * Sección del pénsum: un bloque por trimestre con sus materias, badge de
 * aprobada y chips de prerrequisitos por código.
 */
export function PensumSection({ grupos }: { grupos: GrupoTrimestre[] }) {
  if (grupos.length === 0) {
    return (
      <ThemedText tone="secondary">
        El plan de estudios de esta carrera aún no tiene materias registradas.
      </ThemedText>
    );
  }

  return (
    <View style={estilos.lista}>
      {grupos.map((grupo) => (
        <View key={grupo.trimestre} style={estilos.grupo}>
          <ThemedText variant="subtitle" weight="semibold">
            Trimestre {grupo.trimestre}
          </ThemedText>
          {grupo.items.map((materia) => (
            <ThemedView key={materia.codigo} variant="card" style={estilos.tarjeta}>
              <View style={estilos.cabecera}>
                <ThemedText variant="caption" tone="tertiary">
                  {materia.codigo} · {materia.creditos} créd.
                </ThemedText>
                {materia.aprobada ? (
                  <View style={estilos.badge}>
                    <ThemedText variant="caption" weight="semibold">
                      Aprobada
                    </ThemedText>
                  </View>
                ) : null}
              </View>
              <ThemedText variant="body" weight="semibold" numberOfLines={2}>
                {materia.nombre}
              </ThemedText>
              {materia.prerequisitos.length > 0 ? (
                <View style={estilos.prereqs}>
                  <ThemedText variant="caption" tone="secondary">
                    Requiere:
                  </ThemedText>
                  {materia.prerequisitos.map((codigo) => (
                    <View key={codigo} style={estilos.chip}>
                      <ThemedText variant="caption">{codigo}</ThemedText>
                    </View>
                  ))}
                </View>
              ) : (
                <ThemedText variant="caption" tone="tertiary">
                  Sin prerrequisitos
                </ThemedText>
              )}
            </ThemedView>
          ))}
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  lista: {
    gap: spacing.four,
  },
  grupo: {
    gap: spacing.two,
  },
  tarjeta: {
    gap: spacing.one,
  },
  cabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.two,
  },
  badge: {
    paddingHorizontal: spacing.two,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.background.sunken,
  },
  prereqs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.one,
  },
  chip: {
    paddingHorizontal: spacing.two,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.background.elevated,
  },
});
