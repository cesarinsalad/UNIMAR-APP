import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from './theme';
import { ThemedText, type ThemedTextProps } from './ThemedText';

export interface ListItemProps extends Omit<PressableProps, 'children' | 'title'> {
  title: string;
  titleProps?: Pick<ThemedTextProps, 'variant' | 'weight' | 'tone'>;
  subtitle?: string;
  /** Contenido a la izquierda (avatar, icono). */
  leading?: React.ReactNode;
  /** Contenido a la derecha (badge, hora, chevron). */
  trailing?: React.ReactNode;
  /** Item presionable: agrega feedback ripple. */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Fila de lista: leading, título, subtítulo y trailing, sin divisiones duras. */
export function ListItem({
  title,
  titleProps,
  subtitle,
  leading,
  trailing,
  onPress,
  style,
  ...rest
}: ListItemProps) {
  const body = (
    <>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.textos}>
        <ThemedText
          variant={titleProps?.variant ?? 'body'}
          weight={titleProps?.weight ?? 'medium'}
          tone={titleProps?.tone ?? 'primary'}
          numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText variant="caption" tone="secondary" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        {...rest}
        onPress={onPress}
        android_ripple={{ color: colors.brand.surfaceBlue }}
        style={({ pressed }) => [styles.base, pressed && styles.pressed, style]}>
        {body}
      </Pressable>
    );
  }
  return (
    <View {...rest} style={[styles.base, style]}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pressed: { opacity: 0.85 },
  leading: { justifyContent: 'center' },
  textos: { flex: 1, gap: spacing.xs },
  trailing: { justifyContent: 'center' },
});
