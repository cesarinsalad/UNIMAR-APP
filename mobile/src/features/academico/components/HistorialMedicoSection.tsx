import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';
import type { HistorialMedicoDTO } from '../types';

const FORMATO_FECHA = new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' });

/**
 * Contenido del historial médico: banner de privacidad + tipo de sangre
 * destacado + alergias + tabla de vacunas. Solo lectura en v1.
 */
export function HistorialMedicoSection({ historial }: { historial: HistorialMedicoDTO }) {
  return (
    <View style={estilos.bloque}>
      <ThemedView variant="card" style={estilos.banner}>
        <ThemedText variant="caption" weight="semibold">
          Información sensible
        </ThemedText>
        <ThemedText variant="caption" tone="secondary">
          Visible solo para ti. Ni siquiera los administradores tienen acceso.
        </ThemedText>
      </ThemedView>

      <ThemedView variant="card" style={estilos.tarjeta}>
        <ThemedText variant="caption" tone="secondary">
          Tipo de sangre
        </ThemedText>
        <ThemedText variant="headline" weight="bold">
          {historial.tipoSangre}
        </ThemedText>
      </ThemedView>

      <ThemedView variant="card" style={estilos.tarjeta}>
        <ThemedText variant="subtitle" weight="semibold">
          Alergias
        </ThemedText>
        {historial.alergias.length === 0 ? (
          <ThemedText variant="caption" tone="tertiary">
            Sin alergias registradas.
          </ThemedText>
        ) : (
          historial.alergias.map((alergia) => (
            <View key={alergia} style={estilos.chip}>
              <ThemedText variant="body">{alergia}</ThemedText>
            </View>
          ))
        )}
      </ThemedView>

      <ThemedView variant="card" style={estilos.tarjeta}>
        <ThemedText variant="subtitle" weight="semibold">
          Vacunas
        </ThemedText>
        {historial.vacunas.length === 0 ? (
          <ThemedText variant="caption" tone="tertiary">
            Sin vacunas registradas.
          </ThemedText>
        ) : (
          historial.vacunas.map((vacuna) => (
            <View key={`${vacuna.nombre}-${vacuna.fecha}`} style={estilos.filaVacuna}>
              <ThemedText variant="body" weight="medium" style={estilos.nombreVacuna}>
                {vacuna.nombre}
              </ThemedText>
              <ThemedText variant="caption" tone="secondary">
                {FORMATO_FECHA.format(new Date(vacuna.fecha))}
              </ThemedText>
            </View>
          ))
        )}
      </ThemedView>
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: {
    gap: spacing.three,
  },
  tarjeta: {
    gap: spacing.two,
  },
  banner: {
    gap: spacing.one,
    borderWidth: 1,
    borderColor: colors.border.strong,
  },
  chip: {
    paddingHorizontal: spacing.three,
    paddingVertical: spacing.two,
    borderRadius: radius.pill,
    backgroundColor: colors.background.elevated,
    alignSelf: 'flex-start',
  },
  filaVacuna: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.two,
  },
  nombreVacuna: {
    flex: 1,
  },
});
