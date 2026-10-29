import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { CaretDownIcon } from 'phosphor-react-native';

import { colors, radius, spacing, touchTarget } from '@/shared/ui';
import { ThemedText } from '@/shared/ui';
import type { GrupoAno } from '../helpers';
import { AcordeonPeriodo } from './AcordeonPeriodo';

/**
 * Nivel de año del índice del historial: cabecera plana presionable —
 * badge azul sello (geometría exacta del header de mes de Agenda: 44px,
 * radius.button, cifra bold blanca), conteo de materias del año y caret
 * que rota 180° en 150ms. Sin tarjeta alrededor: el badge ES la identidad
 * y anidar cards dentro de cards rompe la firma del documento. Al
 * abrirse revela los acordeones de trimestre (fade simétrico,
 * respetando motion reducido: sin transición, el estado llega igual).
 * Arranca colapsado: el índice por año es quien ordena.
 */
export function AcordeonAno({ ano }: { ano: GrupoAno }) {
  const [abierto, setAbierto] = useState(false);
  const reducido = useReducedMotion();
  const total = ano.grupos.reduce((n, grupo) => n + grupo.materias.length, 0);

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Historial de ${ano.anio}`}
        accessibilityState={{ expanded: abierto }}
        style={({ pressed }) => [estilos.cabecera, pressed && { opacity: 0.85 }]}
        onPress={() => setAbierto((v) => !v)}>
        <View style={estilos.badgeAno}>
          <ThemedText variant="body" weight="bold" style={estilos.cifraAno}>
            {ano.anio}
          </ThemedText>
        </View>
        <ThemedText variant="caption" tone="secondary">
          {total === 1 ? '1 materia' : `${total} materias`}
        </ThemedText>
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
          {ano.grupos.map((grupo) => (
            <AcordeonPeriodo
              key={grupo.periodo}
              periodo={grupo.periodo}
              materias={grupo.materias}
            />
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  // Peso óptico: la cabecera vive de la altura del badge (44), sin aire
  // vertical extra; el presionable abarca la fila completa.
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  badgeAno: {
    backgroundColor: colors.brand.primary,
    borderRadius: radius.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: touchTarget.min,
    justifyContent: 'center',
  },
  cifraAno: {
    color: colors.text.onPrimary,
  },
  caret: {
    transform: [{ rotate: '0deg' }],
    marginLeft: 'auto',
  },
  transicionCaret: {
    transitionProperty: 'transform',
    transitionDuration: '150ms',
    transitionTimingFunction: 'ease-in-out',
  },
  caretAbierto: {
    transform: [{ rotate: '180deg' }],
  },
  // Los trimestres cuelgan del año por proximidad (8px) y se separan
  // entre sí por el gap de catálogo (12).
  contenido: {
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
});
