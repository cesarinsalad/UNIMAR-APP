import { StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { colors, fontFamily, typography } from './theme';

type Variant = 'caption' | 'bodySm' | 'body' | 'subtitle' | 'title' | 'headline';
type Tone = 'primary' | 'secondary' | 'tertiary' | 'onPrimary';

// Alias legacy: `bodyLg` quedó fusionado con `body` (16px).
type LegacyAlias = 'bodyLg';
export type ThemedTextVariant = Variant | LegacyAlias;

export interface ThemedTextProps extends TextProps {
  variant?: ThemedTextVariant;
  tone?: Tone;
  weight?: keyof typeof typography.weight;
}

const FONT_BY_WEIGHT: Record<keyof typeof typography.weight, string> = {
  regular: fontFamily.regular,
  medium: fontFamily.medium,
  semibold: fontFamily.semibold,
  bold: fontFamily.bold,
};

function variantToSize(v: ThemedTextVariant): number {
  return typography.size[v === 'bodyLg' ? 'body' : v];
}

function variantToLineHeight(v: ThemedTextVariant): number {
  return typography.lineHeight[v === 'bodyLg' ? 'body' : v];
}

function toneToColor(t: Tone): string {
  if (t === 'onPrimary') return colors.text.onPrimary;
  if (t === 'secondary' || t === 'tertiary') return colors.text.secondary;
  return colors.text.primary;
}

export function ThemedText({
  variant = 'body',
  tone = 'primary',
  weight = 'regular',
  style,
  ...rest
}: ThemedTextProps) {
  const size = variantToSize(variant);
  // El peso va embebido en el archivo de fuente (fontFamily); setting
  // fontWeight además hace conflictos en Android con fuentes variables.
  const merged: TextStyle = {
    color: toneToColor(tone),
    fontFamily: FONT_BY_WEIGHT[weight],
    fontSize: size,
    lineHeight: variantToLineHeight(variant),
  };
  return <RNText {...rest} style={[styles.base, merged, style]} />;
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});
