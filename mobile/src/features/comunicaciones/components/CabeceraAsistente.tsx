import { Pressable, StyleSheet, View } from 'react-native';
import { ArrowLeftIcon } from 'phosphor-react-native';

import { colors, radius, spacing, touchTarget } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/ThemedText';

export type PasoAsistente = 1 | 2 | 3;

const ETIQUETAS: Record<PasoAsistente, string> = {
  1: 'Contenido',
  2: 'Detalles',
  3: 'Revisión',
};

interface Props {
  paso: PasoAsistente;
  titulo?: string;
  onAtras: () => void;
  atrasDeshabilitado?: boolean;
  onSiguiente?: () => void;
  siguienteEtiqueta?: string;
  siguienteDeshabilitado?: boolean;
}

/** Cabecera contextual del asistente: reemplaza la barra institucional. */
export function CabeceraAsistente({
  paso,
  titulo = 'Nuevo comunicado',
  onAtras,
  atrasDeshabilitado = false,
  onSiguiente,
  siguienteEtiqueta = 'Siguiente',
  siguienteDeshabilitado = false,
}: Props) {
  return (
    <View
      accessibilityLabel={`Paso ${paso} de 3: ${ETIQUETAS[paso]}`}
      style={estilos.contenedor}>
      <View style={estilos.filaTitulo}>
        <ThemedText
          variant="body"
          weight="semibold"
          numberOfLines={1}
          style={estilos.titulo}>
          {titulo}
        </ThemedText>
      </View>

      <View style={estilos.filaAcciones}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          accessibilityState={{ disabled: atrasDeshabilitado }}
          disabled={atrasDeshabilitado}
          onPress={onAtras}
          hitSlop={8}
          style={({ pressed }) => [
            estilos.botonAtras,
            atrasDeshabilitado && estilos.deshabilitado,
            pressed && !atrasDeshabilitado && estilos.presionado,
          ]}>
          <ArrowLeftIcon size={22} weight="bold" color={colors.text.primary} />
        </Pressable>

        {onSiguiente ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={siguienteEtiqueta}
            accessibilityState={{ disabled: siguienteDeshabilitado }}
            disabled={siguienteDeshabilitado}
            onPress={onSiguiente}
            hitSlop={8}
            style={({ pressed }) => [
              estilos.botonSiguiente,
              siguienteDeshabilitado && estilos.deshabilitado,
              pressed && !siguienteDeshabilitado && estilos.presionado,
            ]}>
            <ThemedText
              variant="bodySm"
              weight="semibold"
              numberOfLines={1}
              style={estilos.textoSiguiente}>
              {siguienteEtiqueta}
            </ThemedText>
          </Pressable>
        ) : (
          <View />
        )}
      </View>

      <View style={estilos.progreso} accessibilityElementsHidden>
        {([1, 2, 3] as const).map((numero) => {
          const esActual = numero === paso;
          const completado = numero < paso;
          return (
            <View key={numero} style={estilos.columnaPaso}>
              <ThemedText
                variant="caption"
                weight={esActual ? 'semibold' : 'regular'}
                tone={esActual || completado ? 'primary' : 'secondary'}
                numberOfLines={1}
                style={[
                  estilos.etiquetaPaso,
                  completado && estilos.etiquetaPasoCompletada,
                  esActual && estilos.etiquetaPasoActiva,
                ]}>
                {ETIQUETAS[numero]}
              </ThemedText>
              <View
                style={[estilos.segmento, numero <= paso && estilos.segmentoActivo]}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    backgroundColor: colors.bg.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  filaTitulo: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xs,
  },
  filaAcciones: {
    minHeight: touchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  botonAtras: {
    width: touchTarget.min,
    height: touchTarget.min,
    marginLeft: -spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonSiguiente: {
    minWidth: 68,
    minHeight: touchTarget.min,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  titulo: {
    textAlign: 'center',
  },
  textoSiguiente: {
    color: colors.brand.primary,
  },
  deshabilitado: {
    opacity: 0.35,
  },
  presionado: {
    opacity: 0.65,
  },
  progreso: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  columnaPaso: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  etiquetaPaso: {
    textAlign: 'center',
  },
  etiquetaPasoActiva: {
    color: colors.brand.primary,
  },
  etiquetaPasoCompletada: {
    color: colors.brand.primarySoft,
  },
  segmento: {
    width: '100%',
    height: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.border.subtle,
  },
  segmentoActivo: {
    backgroundColor: colors.brand.primary,
  },
});
