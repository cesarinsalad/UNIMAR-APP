import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, spacing } from './theme';
import { ThemedText } from './ThemedText';

export interface SectionHeaderProps {
  title: string;
  /** Texto o contenido de la acción al final (ej. "Ver todo"). */
  action?: React.ReactNode;
  style?: ViewStyle;
}

/** Título de sección (subtitle/SemiBold) con acción opcional. */
export function SectionHeader({ title, action, style }: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <ThemedText variant="subtitle" weight="semibold" numberOfLines={1}>
        {title}
      </ThemedText>
      {action ? (
        <ThemedText variant="bodySm" weight="medium" style={styles.action}>
          {action}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  action: { color: colors.brand.primary },
});
