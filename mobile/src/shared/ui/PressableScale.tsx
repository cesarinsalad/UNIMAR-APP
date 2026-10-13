import { useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

const CURVA = 'cubic-bezier(0.23, 1, 0.32, 1)';

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children?: ReactNode;
  /** Estilo del contenido animado (la tarjeta/fila que respira al presionar). */
  style?: StyleProp<ViewStyle>;
}

/**
 * Feedback táctil del sistema: scale 0.97 en 120ms vía CSS transition
 * (techo del skill para interacciones de decenas/día — casi imperceptible).
 * Con motion reducido degrada a cambio de opacidad (sin transforms).
 * `pressRetentionOffset` evita cancelar el press si el dedo deriva.
 */
export function PressableScale({ children, style, ...rest }: PressableScaleProps) {
  const [presionado, setPresionado] = useState(false);
  const reducido = useReducedMotion();

  return (
    <Pressable
      {...rest}
      pressRetentionOffset={16}
      onPressIn={(e) => {
        setPresionado(true);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPresionado(false);
        rest.onPressOut?.(e);
      }}>
      <Animated.View
        style={[
          estilos.base,
          !reducido && estilos.transicion,
          presionado && (reducido ? estilos.presionReducido : estilos.presionado),
          style,
        ]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: { transform: [{ scale: 1 }] },
  transicion: {
    transitionProperty: 'transform',
    transitionDuration: '120ms',
    transitionTimingFunction: CURVA,
  },
  presionado: { transform: [{ scale: 0.97 }] },
  presionReducido: { opacity: 0.85 },
});
