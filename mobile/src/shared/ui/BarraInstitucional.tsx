import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Logo from '../../../assets/images/unimar/logo-horizontal-blanco.png';

import { colors, radius, spacing } from './theme';

/**
 * Barra superior institucional persistente. Estructura en dos zonas con
 * fondos correctos: franja azul full-bleed SOLO a la altura del inset de
 * la status bar (tint light lo fija el layout raíz), y sobre blanco puro
 * (bg.surface — el mismo que pintan las pantallas debajo) una "chapa"
 * azul con esquinas inferiores redondeadas. Sin sombra a propósito: la
 * nativa la tapaba el Stack y el degradado se retiró por decisión de
 * diseño (silueta limpia, la profundidad la dan las esquinas). El slot
 * de acción va sobre el azul con el badge naranja intacto.
 *
 * Vive FUERA del Stack en (app)/_layout, de modo que es fija en toda la
 * app autenticada — incluso durante transiciones. Los screens NO vuelven
 * a sumar insets.top: la barra es la única dueña de ese inset.
 */
export function BarraInstitucional({ action }: { action?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={estilos.base}>
      <View style={[estilos.franjaStatus, { height: insets.top }]} />
      <View style={estilos.chapa}>
        <Image source={Logo} style={estilos.logo} resizeMode="contain" />
        {action ? <View style={estilos.action}>{action}</View> : null}
      </View>
    </View>
  );
}

const ALTURA_CHAPA = 52;

const estilos = StyleSheet.create({
  base: { backgroundColor: colors.bg.surface },
  franjaStatus: { backgroundColor: colors.brand.primary },
  chapa: {
    height: ALTURA_CHAPA,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    backgroundColor: colors.brand.primary,
  },
  logo: { width: 148, height: 32 },
  action: {
    position: 'absolute',
    right: spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
