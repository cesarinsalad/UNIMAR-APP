import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/shared/ui';
import { ThemedText } from '@/shared/ui';
import type { CeldaDia, TipoPunto } from '../calendario-calculo';

const DIAS_SEMANA = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];

interface Props {
  semanas: CeldaDia[][];
  /** Tipo de punto por día (OFICIAL azul / PERSONAL naranja). */
  puntos: ReadonlyMap<string, TipoPunto>;
  seleccionado: string | null;
  onSeleccionar: (clave: string) => void;
}

/** Grid mensual de celdas (FlexWrap de 7 columnas), lunes primero. */
export function GridMes({ semanas, puntos, seleccionado, onSeleccionar }: Props) {
  return (
    <View>
      <View style={estilos.fila}>
        {DIAS_SEMANA.map((letra) => (
          <View key={letra} style={[estilos.celda, estilos.centro]}>
            <ThemedText variant="caption" style={estilos.etiquetaSemana}>
              {letra}
            </ThemedText>
          </View>
        ))}
      </View>
      {semanas.map((semana, indice) => (
        <View key={`semana-${indice}`} style={estilos.fila}>
          {semana.map((celda) => (
            <Celda
              key={celda.clave}
              celda={celda}
              puntos={puntos}
              seleccionado={seleccionado}
              onSeleccionar={onSeleccionar}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function Celda({
  celda,
  puntos,
  seleccionado,
  onSeleccionar,
}: {
  celda: CeldaDia;
  puntos: ReadonlyMap<string, TipoPunto>;
  seleccionado: string | null;
  onSeleccionar: (clave: string) => void;
}) {
  if (!celda.delMes) {
    // Día de otro mes (altura fija del grid 6x7): visible pero atenuado,
    // no interactivo (no selecciona, no muestra puntos).
    return (
      <View style={estilos.celda}>
        <View style={estilos.contenidoCelda}>
          <ThemedText variant="body" style={{ color: colors.text.secondary }}>
            {String(celda.dia).padStart(2, '0')}
          </ThemedText>
        </View>
      </View>
    );
  }
  const esSeleccionado = celda.clave === seleccionado;
  // La selección gana sobre "hoy": nunca mezclar fondo claro con texto blanco.
  const fondo = esSeleccionado
    ? estilos.celdaSeleccionada
    : celda.esHoy
      ? estilos.celdaHoy
      : null;
  const colorTexto = esSeleccionado ? colors.text.onPrimary : colors.text.primary;
  const punto = puntos.get(celda.clave);

  return (
    <Pressable style={estilos.celda} onPress={() => onSeleccionar(celda.clave)}>
      <View style={[estilos.contenidoCelda, fondo]}>
        <ThemedText variant="body" style={{ color: colorTexto }}>
          {String(celda.dia).padStart(2, '0')}
        </ThemedText>
        {punto ? <View style={[estilos.punto, { backgroundColor: colorPunto(punto) }]} /> : null}
      </View>
    </Pressable>
  );
}

/** Azul corporativo = evento UNIMAR (OFICIAL); naranja = personal. */
export function colorPunto(tipo: TipoPunto): string {
  return tipo === 'OFICIAL' ? colors.brand.primary : colors.accent.urgent;
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
  },
  celda: {
    flex: 1,
    aspectRatio: 1,
    margin: 1,
  },
  contenidoCelda: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  centro: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  etiquetaSemana: {
    color: colors.text.primary,
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
  },
  celdaHoy: {
    backgroundColor: colors.brand.surfaceBlue,
  },
  celdaSeleccionada: {
    backgroundColor: colors.brand.primary,
  },
  punto: {
    width: 5,
    height: 5,
    borderRadius: spacing.xs,
    position: 'absolute',
    bottom: spacing.xs,
  },
});
