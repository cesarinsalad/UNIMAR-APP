import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { CaretDownIcon } from 'phosphor-react-native';

import {
  colors,
  elevation,
  highlight,
  radius,
  spacing,
  touchTarget,
} from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';
import type { MateriaHistoricaDTO } from '../types';
import { formatearPeriodo, partesPeriodo, etiquetaEstadoHistorica } from '../helpers';
import { colorNotaClases } from './MateriaActualCard';
import { SelloUsoPersonal } from './SelloUsoPersonal';

/**
 * Acordeón del historial académico por período (un grupo = un período).
 * La cabecera apila el término en MAYÚSCULAS caption semibold (la receta
 * eyebrow de la casa) y el conteo de materias debajo — el año vive en el
 * ancla de sección que agrupa los acordeones en index.tsx; la
 * accesibilidad conserva la etiqueta completa con el año. Formatos ajenos
 * caen a su etiqueta plana. Al desplegarse, las filas de materias (densas,
 * bodySm/nombre + caption/código + nota semaforizada a la derecha) son
 * solo lectura — sin navegación al detalle — y entran y salen con un
 * fade simétrico — respetando motion reducido: sin transición, el estado
 * llega igual. Arranca colapsado: el índice por año es quien ordena.
 */
export function AcordeonPeriodo({
  periodo,
  materias,
}: {
  periodo: string;
  materias: MateriaHistoricaDTO[];
}) {
  const [abierto, setAbierto] = useState(false);
  const reducido = useReducedMotion();
  const partes = partesPeriodo(periodo);
  const etiquetaTermino = partes.termino !== null;

  return (
    <ThemedView variant="card" padding="zero" style={estilos.tarjeta}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Historial de ${formatearPeriodo(periodo)}`}
        accessibilityState={{ expanded: abierto }}
        style={({ pressed }) => [estilos.cabecera, pressed && { opacity: 0.85 }]}
        onPress={() => setAbierto((v) => !v)}>
        <View style={estilos.titulos}>
          {etiquetaTermino ? (
            <ThemedText
              variant="caption"
              weight="semibold"
              numberOfLines={1}
              style={estilos.etiquetaTermino}>
              {partes.termino}
            </ThemedText>
          ) : (
            <ThemedText
              variant="bodySm"
              weight="semibold"
              numberOfLines={1}>
              {formatearPeriodo(periodo)}
            </ThemedText>
          )}
          <ThemedText variant="caption" tone="secondary">
            {materias.length === 1 ? '1 materia' : `${materias.length} materias`}
          </ThemedText>
        </View>
        <Animated.View
          style={[
            estilos.caret,
            !reducido && estilos.transicionCaret,
            abierto && estilos.caretAbierto,
          ]}>
          <CaretDownIcon size={14} color={colors.text.secondary} />
        </Animated.View>
      </Pressable>
      {abierto ? (
        <Animated.View
          entering={reducido ? undefined : FadeIn.duration(120)}
          exiting={reducido ? undefined : FadeOut.duration(100)}
          style={estilos.contenido}>
          {materias.map((materia, indice) => (
            <Fragment key={materia.id}>
              {indice > 0 ? <View style={estilos.divisor} /> : null}
              <View style={estilos.fila}>
                <View style={estilos.titulosFila}>
                  <ThemedText variant="bodySm" weight="medium" numberOfLines={2}>
                    {materia.nombre}
                  </ThemedText>
                  <ThemedText variant="caption" tone="tertiary">
                    {materia.codigo}
                  </ThemedText>
                </View>
                <View style={estilos.columnaNota}>
                  <ThemedText
                    variant="subtitle"
                    weight="semibold"
                    style={{ color: colorNotaClases(materia.nota_final) }}>
                    {materia.nota_final === null
                      ? '—'
                      : Math.round(materia.nota_final).toString()}
                  </ThemedText>
                  {materia.estado === 'RETIRADA' ? (
                    <ThemedText variant="caption" tone="secondary">
                      {etiquetaEstadoHistorica(materia.estado)}
                    </ThemedText>
                  ) : null}
                </View>
              </View>
            </Fragment>
          ))}
          <SelloUsoPersonal />
        </Animated.View>
      ) : null}
    </ThemedView>
  );
}

const estilos = StyleSheet.create({
  // Sombra de tarjeta al reposo (vocabulario de Card.tsx): elevation.sm +
  // resplandor superior. Sin overflow hidden — recortaba la sombra en iOS
  // (ya no hay fileRule que recortar).
  tarjeta: {
    ...elevation.sm,
    ...highlight.sm,
  },
  etiquetaTermino: {
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  titulos: {
    flex: 1,
    gap: spacing.xs,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touchTarget.min,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  caret: {
    transform: [{ rotate: '0deg' }],
    marginLeft: spacing.xs,
  },
  transicionCaret: {
    transitionProperty: 'transform',
    transitionDuration: '150ms',
    transitionTimingFunction: 'ease-in-out',
  },
  caretAbierto: {
    transform: [{ rotate: '180deg' }],
  },
  // El sello de referencia se recorta aquí (nunca en la tarjeta con
  // sombra): radios inferiores al redondeo de la tarjeta.
  contenido: {
    paddingBottom: spacing.xs,
    overflow: 'hidden',
    borderBottomLeftRadius: radius.card,
    borderBottomRightRadius: radius.card,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  titulosFila: {
    flex: 1,
    gap: spacing.xs,
  },
  // Columna de la cifra, alineada a la derecha; bajo el "—" del retiro
  // aparece "Retirada" en gris metadato (el dash solo dice "sin nota").
  columnaNota: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  divisor: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
    marginHorizontal: spacing.xl,
  },
});
