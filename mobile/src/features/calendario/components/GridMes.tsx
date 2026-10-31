import { Pressable, StyleSheet, View } from 'react-native';

import {
  PALETA_CALENDARIO_UNIMAR,
  colors,
  radius,
  spacing,
  type TipoEventoCalendario,
} from '@/shared/ui';
import { ThemedText } from '@/shared/ui';
import { type CeldaDia, desdeClave } from '../calendario-calculo';

const DIAS_SEMANA = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];

/** Info del día para los puntos de color y el label de accesibilidad. */
export interface InfoDia {
  /** Naturalezas visuales presentes ese día (orden canónico, sin repetir). */
  tipos: TipoEventoCalendario[];
  cantidad: number;
}

interface Props {
  semanas: CeldaDia[][];
  /** Info por día: los tipos presentes (un punto de color por tipo). */
  puntos: ReadonlyMap<string, InfoDia>;
  seleccionado: string | null;
  onSeleccionar: (clave: string) => void;
}

/** Grid mensual de celdas (FlexWrap de 7 columnas), lunes primero. */
export function GridMes({ semanas, puntos, seleccionado, onSeleccionar }: Props) {
  return (
    <View>
      <View style={estilos.capsulaSemana}>
        {DIAS_SEMANA.map((letra) => (
          <View key={letra} style={estilos.celdaSemana}>
            <ThemedText variant="caption" weight="semibold" style={estilos.etiquetaSemana}>
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

/** "14 de octubre de 2026" (+ ", hoy" / ", 2 eventos" / tipos) para VoiceOver. */
function etiquetaDia(celda: CeldaDia, info: InfoDia | undefined): string {
  const fecha = desdeClave(celda.clave).toLocaleDateString('es-VE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const partes = [fecha];
  if (celda.esHoy) partes.push('hoy');
  if (info) {
    partes.push(info.cantidad === 1 ? '1 evento' : `${info.cantidad} eventos`);
    if (info.tipos.length > 0) partes.push(nombresTipos(info.tipos));
  }
  return partes.join(', ');
}

/** "institucional y personal" / "campus, decanato y personal". */
function nombresTipos(tipos: TipoEventoCalendario[]): string {
  const nombres = tipos.map((t) => PALETA_CALENDARIO_UNIMAR[t].nombre.toLowerCase());
  if (nombres.length <= 2) return nombres.join(' y ');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
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
  // Semántica de la celda: los tipos hablan por PUNTOS (uno por naturaleza
  // presente, en su color propio — no hay mezclas ni prioridades); el
  // CONTORNO sigue siendo la acción (anillo de selección). El tinte de
  // "hoy" queda: es un dato del día, no de tipo.
  const fondoEstilo = celda.esHoy ? { backgroundColor: colors.brand.surfaceBlue } : null;
  const destacado = Boolean(info) || celda.esHoy;
  const colorTexto = celda.esHoy ? colors.brand.primary : colors.text.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: esSeleccionado }}
      accessibilityLabel={etiquetaDia(celda, info)}
      style={[estilos.celda, esSeleccionado && estilos.anilloSeleccion]}
      onPress={() => onSeleccionar(celda.clave)}>
      <View style={[estilos.contenidoCelda, fondoEstilo]}>
        <ThemedText
          variant="body"
          weight={destacado ? 'semibold' : 'regular'}
          style={{ color: colorTexto }}>
          {String(celda.dia).padStart(2, '0')}
        </ThemedText>
        <View style={estilos.filaPuntos}>
          {(info?.tipos ?? []).map((tipo) => (
            <View key={tipo} style={[estilos.punto, { backgroundColor: PALETA_CALENDARIO_UNIMAR[tipo].color }]} />
          ))}
        </View>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
  },
  // Cápsula gris muy suave que corona el mes: el membrete de la semana.
  capsulaSemana: {
    flexDirection: 'row',
    backgroundColor: colors.background.sunken,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  celda: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
  },
  // Celdas del membrete: mismas 7 columnas (flex igual al grid) sin altura
  // cuadrada — la cápsula manda en la altura, las letras quedan centradas
  // sobre las columna de cifras de abajo.
  celdaSemana: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contenidoCelda: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
  },
  etiquetaSemana: {
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  // Selección = contorno (con respiro de 2px); el dato vive en los puntos.
  anilloSeleccion: {
    borderWidth: 2,
    borderColor: colors.brand.primary,
    padding: 2,
  },
  filaPuntos: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 3,
    minHeight: 6,
  },
  // Punto de naturaleza del evento: 6px redondo en el color de la paleta.
  punto: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
