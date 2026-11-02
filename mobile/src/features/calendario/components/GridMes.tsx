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
  const esSeleccionado = celda.clave === seleccionado;
  const info = puntos.get(celda.clave);
  // Semántica de la celda: el círculo es el HALO del dígito (base blanca,
  // tinte de "hoy" y borde de selección comparten esa misma forma) y los
  // tipos hablan por PUNTOS en la banda inferior de la celda — FUERA de la
  // circunferencia, sin pelear contra la curva. Los días de otro mes son
  // tocables igual (saltan a su mes) y comparten la forma; sin puntos
  // porque la agenda solo trae datos del mes mostrado.
  const atenuado = !celda.delMes;
  const fondoEstilo = celda.esHoy ? { backgroundColor: colors.brand.surfaceBlue } : null;
  const colorTexto = celda.esHoy
    ? colors.brand.primary
    : atenuado
      ? colors.border.strong
      : colors.text.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: esSeleccionado }}
      accessibilityLabel={etiquetaDia(celda, info)}
      style={estilos.celda}
      onPress={() => onSeleccionar(celda.clave)}>
      {/* Círculo-halo del dígito: la selección es el BORDE del propio
          círculo (un solo elemento, sin capas que alinear) — día no-hoy →
          círculo con borde, "hoy" → tinte + borde en el mismo bloque. */}
      <View
        style={[estilos.circulo, fondoEstilo, esSeleccionado && estilos.bordeSeleccion]}>
        <ThemedText
          variant="body"
          // Cifras del mes en bold: el dígito es el elemento estable del grid
          // y el estatus lo cargan los puntos de color debajo (no hay peso
          // diferencial entre día con y sin eventos). Fuera de mes: regular
          // y atenuado para no competir.
          weight={atenuado ? 'regular' : 'bold'}
          style={{ color: colorTexto }}>
          {String(celda.dia).padStart(2, '0')}
        </ThemedText>
      </View>
      {/* Puntos en la banda inferior de la celda, por fuera del halo —
          como hijos del Pressable (no del círculo) no los recorta el radio. */}
      {!atenuado ? (
        <View style={estilos.filaPuntos} pointerEvents="none">
          {(info?.tipos ?? []).map((tipo) => (
            <View key={tipo} style={[estilos.punto, { backgroundColor: PALETA_CALENDARIO_UNIMAR[tipo].color }]} />
          ))}
        </View>
      ) : null}
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
  // El círculo es el HALO del dígito (~88% de la celda, cuadrado por
  // aspectRatio → circunferencia perfecta): base blanca real, tinte de
  // "hoy" y borde de selección comparten esta misma forma. Abraza al
  // dígito con aire, sin amontonarlo.
  circulo: {
    width: '88%',
    aspectRatio: 1,
    alignSelf: 'center',
    // Sin marginTop: el halo ocupa [0..~40px] de la celda y deja intacta
    // la banda de puntos [42..46] — el anillo de selección (trazo inferior
    // del halo) nunca se traslapa con los puntos.
    alignItems: 'center',
    justifyContent: 'center',
    // BASE BLANCA real (no transparente): invisible sobre el card blanco,
    // pero Android solo dibuja el borde del círculo POR LA RUTA REDONDEADA
    // cuando la vista tiene (o tuvo) un color de fondo — sin drawable,
    // border + radio máximo dibuja el contorno CUADRADO (verificado en el
    // dispositivo). La base garantiza el drawable y el borde circular.
    backgroundColor: colors.bg.surface,
    borderRadius: radius.pill,
  },
  etiquetaSemana: {
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  // La selección es el borde del propio círculo (un solo elemento, sin
  // capas que alinear): día normal seleccionado → halo blanco con borde
  // azul; "hoy" seleccionado → tinte + borde en el mismo bloque. Si el
  // borde cuadrado reapareciera, el fallback documentado es el overlay
  // dedicado (probadamente redondo).
  bordeSeleccion: {
    borderWidth: 2,
    borderColor: colors.brand.primary,
  },
  // Puntos en la banda pegada al borde inferior de la celda (bottom 0) —
  // FUERA de la circunferencia del halo (hijos del Pressable, sin clip):
  // halo termina en ~40px, la banda empieza en 42px → ~1.5px de aire con
  // el trazo del anillo de selección. Los margin: 2 entre celdas separan
  // la banda de la fila de abajo.
  filaPuntos: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 2,
  },
  // Punto de naturaleza del evento: 4px redondo en el color de la paleta
  // (5 colores = 28px, caben holgado en el ancho completo de la banda).
  punto: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
