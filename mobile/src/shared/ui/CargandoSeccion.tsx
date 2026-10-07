import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, spacing } from './theme';

/** Spinner del feed centrado por sección — no bloquea el resto del scroll. */
export function CargandoSeccion() {
  return (
    <View style={estilos.zona}>
      <ActivityIndicator color={colors.brand.primary} />
    </View>
  );
}

const estilos = StyleSheet.create({
  zona: {
    padding: spacing.xl,
    alignItems: 'center',
  },
});
