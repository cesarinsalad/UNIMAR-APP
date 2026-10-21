import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/shared/ui';
import { ThemedText } from '@/shared/ui';
import { type CeldaDia, type TipoPunto, desdeClave } from '../calendario-calculo';

const DIAS_SEMANA = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];

/** Info del día para el bloque de color y el label de accesibilidad. */
export interface InfoDia {
  tipo: TipoPunto;
  /** Mezcla OFICIAL+PERSONAL: bloque por tipo + punto de estado naranja. */
  mixto?: boolean;
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
  // Semántica de la celda: RELLENO = dato (bloque de evento / tinte de hoy);
  // CONTORNO = acción (anillo de selección). Nunca ambos hablan de lo mismo.
  const fondoEstilo = info
    ? { backgroundColor: colorBloque(info.tipo) }
    : celda.esHoy
      ? { backgroundColor: colors.brand.surfaceBlue }
      : null;
  // Dígito del bloque: blanco sobre azul sólido; tinta sobre el tinte
  // naranja (regla AA: el naranja solo sirve de fondo, nunca de texto).
  const colorTexto = info
    ? info.tipo === 'OFICIAL'
      ? colors.text.onPrimary
      : colors.text.primary
    : celda.esHoy
      ? colors.brand.primary
      : colors.text.primary;
  const pesoTexto = info || celda.esHoy ? 'semibold' : 'regular';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: esSeleccionado }}
      accessibilityLabel={etiquetaDia(celda, info)}
      style={[estilos.celda, esSeleccionado && estilos.anilloSeleccion]}
      onPress={() => onSeleccionar(celda.clave)}>
      <View style={[estilos.contenidoCelda, fondoEstilo]}>
        <ThemedText variant="body" weight={pesoTexto} style={{ color: colorTexto }}>
          {String(celda.dia).padStart(2, '0')}
        </ThemedText>
        {info?.mixto ? <View style={estilos.puntoMixto} /> : null}
      </View>
    </Pressable>
  );
}

/** Bloque de estado del día: azul sólido (OFICIAL con dígito blanco);
 *  tinte naranja 12% (PERSONAL con dígito en tinta) — el naranja puro no
 *  alcanza AA con texto pequeño (~2.6:1), así que el color lo carga el
 *  fondo (patrón de tono al 12% de PALETA_CODIGO). */
export function colorBloque(tipo: TipoPunto): string {
  return tipo === 'OFICIAL' ? colors.brand.primary : `${colors.accent.urgent}1F`;
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
  // Selección = contorno (con respiro de 2px), el relleno queda para el dato.
  anilloSeleccion: {
    borderWidth: 2,
    borderColor: colors.brand.primary,
    padding: 2,
  },
  // Día con tipos mezclados: punto de estado naranja con separación blanca
  // sobre el bloque azul (defensa contra la vibración visual).
  puntoMixto: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.accent.urgent,
    borderWidth: 1,
    borderColor: colors.white,
    position: 'absolute',
    bottom: 3,
  },
});
