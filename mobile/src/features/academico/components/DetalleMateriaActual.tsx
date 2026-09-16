import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';
import { colorNota } from '../helpers';
import type { MateriaActualDTO } from '../types';

const FORMATO_FECHA = new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' });

/**
 * Variante en curso (`es_actual: true`): contexto del aula + cortes
 * evaluativos con fecha, ponderación y nota (o `—` si está pendiente).
 */
export function DetalleMateriaActual({ materia }: { materia: MateriaActualDTO }) {
  return (
    <View style={estilos.bloque}>
      <ThemedView variant="card" style={estilos.tarjeta}>
        <Fila etiqueta="Profesor" valor={materia.profesor} />
        <Fila etiqueta="Aula" valor={materia.aula} />
        <Fila etiqueta="Horario" valor={materia.horario} />
        <Fila etiqueta="Créditos" valor={`${materia.creditos}`} />
      </ThemedView>

      <ThemedText variant="subtitle" weight="semibold">
        Evaluaciones
      </ThemedText>
      {materia.cortes.map((corte) => (
        <ThemedView key={corte.nombre} variant="card" style={estilos.corte}>
          <View style={estilos.filaCorte}>
            <ThemedText variant="body" weight="semibold" style={estilos.nombreCorte}>
              {corte.nombre}
            </ThemedText>
            <ThemedText
              variant="bodyLg"
              weight="bold"
              style={{ color: colorDeCorte(corte.nota) }}>
              {corte.nota === null ? '—' : corte.nota.toFixed(0)}
            </ThemedText>
          </View>
          <ThemedText variant="caption" tone="secondary">
            {FORMATO_FECHA.format(new Date(corte.fecha))} · {corte.ponderacion}% de la nota
          </ThemedText>
        </ThemedView>
      ))}
    </View>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={estilos.fila}>
      <ThemedText variant="caption" tone="secondary">
        {etiqueta}
      </ThemedText>
      <ThemedText variant="body" weight="medium">
        {valor}
      </ThemedText>
    </View>
  );
}

function colorDeCorte(nota: number | null): string {
  switch (colorNota(nota)) {
    case 'success':
      return colors.status.success;
    case 'danger':
      return colors.status.danger;
    case 'muted':
      return colors.text.tertiary;
  }
}

const estilos = StyleSheet.create({
  bloque: {
    gap: spacing.three,
  },
  tarjeta: {
    gap: spacing.two,
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.two,
  },
  corte: {
    gap: spacing.one,
  },
  filaCorte: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.two,
  },
  nombreCorte: {
    flex: 1,
  },
});
