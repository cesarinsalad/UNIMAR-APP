import { StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { colors, typography } from '@/shared/ui';

type Variant = 'caption' | 'body' | 'bodyLg' | 'subtitle' | 'title' | 'headline';
type Tone = 'primary' | 'secondary' | 'tertiary' | 'onPrimary';

export interface ThemedTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
  weight?: keyof typeof typography.weight;
}

function variantToSize(v: Variant): number {
  return typography.size[v];
}

function toneToColor(t: Tone): string {
  if (t === 'onPrimary') return colors.text.onPrimary;
  if (t === 'secondary') return colors.text.secondary;
  if (t === 'tertiary') return colors.text.tertiary;
  return colors.text.primary;
}

export function ThemedText({
  variant = 'body',
  tone = 'primary',
  weight = 'regular',
  style,
  ...rest
}: ThemedTextProps) {
  const merged: TextStyle = {
    color: toneToColor(tone),
    fontSize: variantToSize(variant),
    fontWeight: typography.weight[weight],
    lineHeight: variantToSize(variant) * typography.lineHeight.normal,
  };
  return <RNText {...rest} style={[styles.base, merged, style]} />;
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});