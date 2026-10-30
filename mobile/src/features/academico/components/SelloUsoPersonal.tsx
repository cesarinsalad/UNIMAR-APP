import { StyleSheet, View } from 'react-native';

import { colors, typography } from '@/shared/ui';
import { ThemedText } from '@/shared/ui';

/**
 * Sello de referencia: "PARA USO PERSONAL" — la traducción del artefacto
 * institucional de los corte de notas (marca diagonal roja translúcida)
 * a la lengua del sistema: title 700 (el sello es un SELLO, no un título:
 * la excepción al Bold reservado), tracking 1.5, danger al 15%, rotado
 * −15°, centrado sobre el contenido de notas. Estado del DOCUMENTO, no
 * de los datos: clase visual distinta al rojo de reprobadas; Regla
 * Naranja y presupuesto azul intactos. No interactivo (pointerEvents
 * none) y oculto a lectores de pantalla — el disclaimer textual.
 *  El padre lo recorta: overflow hidden + radios inferiores (nunca en la tarjeta con sombra).
 */
export function SelloUsoPersonal() {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={estilos.zona}>
      <ThemedText style={estilos.sello}>PARA USO PERSONAL</ThemedText>
    </View>
  );
}

const estilos = StyleSheet.create({
  zona: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sello: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.5,
    color: `${colors.status.danger}26`,
    transform: [{ rotate: '-15deg' }],
  },
});
