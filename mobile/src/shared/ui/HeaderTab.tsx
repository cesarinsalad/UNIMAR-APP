import { StyleSheet, View } from 'react-native';

import { spacing } from './theme';
import { ThemedText } from './ThemedText';

/**
 * Header de tab: título headline en el contenido con slot de acción.
 * Convención aprobada del sistema: los tabs usan headerShown: false,
 * dibujan este header claro (headline + acción derecha) y dejan a la
 * campana con badge del módulo notificaciones como action — el scroll
 * del screen resuelve los insets (paddingTop: insets.top + spacing.lg).
 */
export function HeaderTab({
  titulo,
  saludo,
  action,
}: {
  titulo: string;
  /** Línea secundaria bajo el título (ej. saludo del Home). */
  saludo?: string;
  /** Contenido a la derecha (ej. <CampanaConBadge …/>). */
  action?: React.ReactNode;
}) {
  return (
    <View style={estilos.cabecera}>
      <View style={estilos.fila}>
        <ThemedText variant="headline" weight="semibold" numberOfLines={1}>
          {titulo}
        </ThemedText>
        {action ? <View style={estilos.action}>{action}</View> : null}
      </View>
      {saludo ? (
        <ThemedText variant="body" tone="secondary" numberOfLines={1}>
          {saludo}
        </ThemedText>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecera: { gap: spacing.sm },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  action: { justifyContent: 'center' },
});
