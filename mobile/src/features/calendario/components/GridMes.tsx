import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/shared/ui';
import { ThemedText } from '@/shared/ui';
import { type CeldaDia, type TipoPunto, desdeClave } from '../calendario-calculo';

const DIAS_SEMANA = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];

/** Info del día para el punto y el label de accesibilidad. */
export interface InfoDia {
  tipo: TipoPunto;
  cantidad: number;
}

interface Props {
  semanas: CeldaDia[][];
  /** Info por día (OFICIAL azul / PERSONAL naranja + cantidad de eventos). */
  puntos: ReadonlyMap<string, InfoDia>;
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

/** "14 de octubre de 2026" (+ ", hoy" / ", 2 eventos") para VoiceOver. */
function etiquetaDia(celda: CeldaDia, info: InfoDia | undefined): string {
  const fecha = desdeClave(celda.clave).toLocaleDateString('es-VE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const partes = [fecha];
  if (celda.esHoy) partes.push('hoy');
  if (info) partes.push(info.cantidad === 1 ? '1 evento' : `${info.cantidad} eventos`);
  return partes.join(', ');
}

function Celda({
  celda,
  puntos,
  seleccionado,
  onSeleccionar,
}: {
  celda: CeldaDia;
  puntos: ReadonlyMap<string, InfoDia>;
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
  const info = puntos.get(celda.clave);
  // La selección gana sobre "hoy" en relleno, pero "hoy" conserva su anillo.
  const fondo = esSeleccionado
    ? estilos.celdaSeleccionada
    : celda.esHoy
      ? estilos.celdaHoy
      : null;
  const colorTexto = esSeleccionado ? colors.text.onPrimary : colors.text.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: esSeleccionado }}
      accessibilityLabel={etiquetaDia(celda, info)}
      style={estilos.celda}
      onPress={() => onSeleccionar(celda.clave)}>
      <View style={[estilos.contenidoCelda, fondo]}>
        <ThemedText variant="body" style={{ color: colorTexto }}>
          {String(celda.dia).padStart(2, '0')}
        </ThemedText>
        {info ? <View style={[estilos.punto, { backgroundColor: colorPunto(info.tipo) }]} /> : null}
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
    padding: 2,
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
  // Hoy: tinte azul + anillo — identificable incluso con otro día seleccionado.
  celdaHoy: {
    backgroundColor: colors.brand.surfaceBlue,
    borderWidth: 1.5,
    borderColor: colors.brand.primary,
  },
  // Selección: relleno sólido y CRECE (el padding se anula) — la convicción
  // del sistema en el grid: el día elegido pesa más que sus vecinos.
  celdaSeleccionada: {
    backgroundColor: colors.brand.primary,
    padding: 0,
  },
  punto: {
    width: 5,
    height: 5,
    borderRadius: spacing.xs,
    position: 'absolute',
    bottom: spacing.xs,
  },
});
