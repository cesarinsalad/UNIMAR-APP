import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { NewspaperIcon } from 'phosphor-react-native';

import { colors } from '@/shared/ui';

/**
 * Portada sustituta para noticias sin imagen: banda surfaceBlue con el
 * sello de periódico duotone en círculo blanco (IconTile invertido).
 * Evita el rectángulo mudo en carrusel, destacada y thumbnails.
 */
export function PortadaPlaceholder({
  tamanoIcono = 28,
  style,
}: {
  tamanoIcono?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const circulo = Math.round(tamanoIcono * 1.75);
  return (
    <View style={[estilos.fondo, style]}>
      <View
        style={[
          estilos.circulo,
          { width: circulo, height: circulo, borderRadius: circulo / 2 },
        ]}>
        <NewspaperIcon size={tamanoIcono} color={colors.brand.primary} weight="duotone" />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    backgroundColor: colors.brand.surfaceBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circulo: {
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
