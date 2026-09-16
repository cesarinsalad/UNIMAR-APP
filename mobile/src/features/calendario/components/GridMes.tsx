import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, typography } from '@/shared/ui';
import type { CeldaDia } from '../calendario-calculo';

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

interface Props {
  semanas: CeldaDia[][];
  /** Claves de día que tienen eventos (celdas con punto). */
  conEventos: ReadonlySet<string>;
  seleccionado: string | null;
  onSeleccionar: (clave: string) => void;
}

/** Grid mensual de celdas (FlexWrap de 7 columnas), lunes primero. */
export function GridMes({ semanas, conEventos, seleccionado, onSeleccionar }: Props) {
  return (
    <View>
      <View style={estilos.fila}>
        {DIAS_SEMANA.map((letra) => (
          <View key={letra} style={estilos.celda}>
            <Text style={estilos.etiquetaSemana}>{letra}</Text>
          </View>
        ))}
      </View>
      {semanas.map((semana, indice) => (
        <View key={`semana-${indice}`} style={estilos.fila}>
          {semana.map((celda) => (
            <Celda
              key={celda.clave}
              celda={celda}
              conEventos={conEventos}
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
  conEventos,
  seleccionado,
  onSeleccionar,
}: {
  celda: CeldaDia;
  conEventos: ReadonlySet<string>;
  seleccionado: string | null;
  onSeleccionar: (clave: string) => void;
}) {
  const esSeleccionado = celda.clave === seleccionado;
  const fondo = celda.esHoy
    ? estilos.celdaHoy
    : esSeleccionado
      ? estilos.celdaSeleccionada
      : null;
  const colorTexto = esSeleccionado
    ? colors.text.onPrimary
    : celda.delMes
      ? colors.text.primary
      : colors.text.tertiary;

  return (
    <Pressable onPress={() => onSeleccionar(celda.clave)}>
      <View style={[estilos.celda, fondo]}>
        <Text style={[estilos.cifra, { color: colorTexto }]}>{celda.dia}</Text>
        {conEventos.has(celda.clave) ? <View style={estilos.punto} /> : null}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
  },
  celda: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  etiquetaSemana: {
    color: colors.text.tertiary,
    fontSize: typography.size.caption,
    fontWeight: '600',
  },
  cifra: {
    fontSize: typography.size.body,
  },
  celdaHoy: {
    backgroundColor: colors.background.sunken,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  celdaSeleccionada: {
    backgroundColor: colors.primary,
  },
  punto: {
    width: 5,
    height: 5,
    borderRadius: 3,
    // STYLE.md §1: el naranja es el acento designado para "puntos de estado
    // en el calendario" — sobre selección azul y sobre celda neutra contrasta.
    backgroundColor: colors.accent,
    position: 'absolute',
    bottom: 4,
  },
});