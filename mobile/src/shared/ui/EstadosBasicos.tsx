import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, spacing } from './theme';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

/** Estado de vacío/error de una sección: apilado centrado con gap opcional. */
export function EstadoCentrado({
  children,
  gap = false,
  style,
}: {
  children: React.ReactNode;
  gap?: boolean;
  style?: ViewStyle;
}) {
  return (
    <ThemedView variant="base" style={[estilos.estado, gap && estilos.estadoConGap, style]}>
      {children}
    </ThemedView>
  );
}

/** Separador de tarjetas/filas apiladas (gap vertical). */
export function Separador() {
  return <View style={estilos.separador} />;
}

/** Separador fino (hairline) para tablas de escritorio. */
export function SeparadorFino() {
  return <View style={estilos.separadorFino} />;
}

/** Copy de error de sección (rojo institucional). */
export function TextoError({ children }: { children: React.ReactNode }) {
  return (
    <ThemedText variant="caption" style={estilos.textoError}>
      {children}
    </ThemedText>
  );
}

const estilos = StyleSheet.create({
  estado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.six,
    gap: spacing.two,
  },
  estadoConGap: { gap: spacing.four },
  separador: { height: spacing.three },
  separadorFino: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
    marginHorizontal: spacing.four,
  },
  textoError: { color: colors.status.danger },
});
