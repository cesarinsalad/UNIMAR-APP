import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { layout } from './theme';

export interface ContenidoCentradoProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Contenedor editorial: limita el contenido al ancho máximo aceptable de
 * lectura (layout.maxContentWidth) y lo centra en la ventana. En móvil no
 * cambia nada (la ventana es más angosta que el máximo); en desktop evita
 * que documentos y formularios se estiren de borde a borde. Primer
 * consumidor del token.
 */
export function ContenidoCentrado({ children, style }: ContenidoCentradoProps) {
  return <View style={[estilos.contenedor, style]}>{children}</View>;
}

const estilos = StyleSheet.create({
  contenedor: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
});
