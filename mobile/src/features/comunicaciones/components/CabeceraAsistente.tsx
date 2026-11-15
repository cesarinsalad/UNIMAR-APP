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
  onAtras: () => void;
  atrasDeshabilitado?: boolean;
  onSiguiente?: () => void;
  siguienteEtiqueta?: string;
  siguienteDeshabilitado?: boolean;
}

/** Cabecera contextual del asistente: reemplaza la barra institucional. */
export function CabeceraAsistente({
  paso,
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
      <View style={estilos.fila}>
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

        <ThemedText variant="body" weight="semibold" style={estilos.titulo}>
          {ETIQUETAS[paso]}
        </ThemedText>

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
            <ThemedText variant="bodySm" weight="semibold" style={estilos.textoSiguiente}>
              {siguienteEtiqueta}
            </ThemedText>
          </Pressable>
        ) : (
          <View style={estilos.espacioDerecha} />
        )}
      </View>

      <View style={estilos.progreso} accessibilityElementsHidden>
        {([1, 2, 3] as const).map((numero) => (
          <View
            key={numero}
            style={[estilos.segmento, numero <= paso && estilos.segmentoActivo]}
          />
        ))}
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
  fila: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
  },
  botonAtras: {
    width: touchTarget.min,
    height: touchTarget.min,
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
  espacioDerecha: {
    width: 68,
  },
  titulo: {
    flex: 1,
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
    paddingBottom: spacing.sm,
  },
  segmento: {
    flex: 1,
    height: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.border.subtle,
  },
  segmentoActivo: {
    backgroundColor: colors.brand.primary,
  },
});
