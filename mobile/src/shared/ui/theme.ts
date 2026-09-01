/**
 * Design tokens UNIMARapp.
 * Implementación ejecutable de /STYLE.md en la raíz del repo.
 * La guía de diseño es la fuente de verdad; este archivo la materializa.
 *
 * Paleta corporativa, escala tipográfica, espaciado en base 4,
 * y elevación por sombras direccionales.
 */

export const colors = {
  primary: '#0D4D98',
  white: '#FFFFFF',
  grayLight: '#E8E8E8',
  grayDark: '#413D3C',
  accent: '#E85D2F',

  text: {
    primary: '#413D3C',
    secondary: '#6B6664',
    tertiary: '#8F8A88',
    onPrimary: '#FFFFFF',
  },

  background: {
    base: '#FFFFFF',
    elevated: '#F7F7F8',
    sunken: '#EEEEF1',
  },

  border: {
    subtle: '#E8E8E8',
    strong: '#D1D1D4',
  },

  status: {
    success: '#2E7D32',
    warning: '#E85D2F',
    danger: '#C62828',
  },
} as const;

export const spacing = {
  base: 4,
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  eight: 32,
  ten: 48,
  twelve: 64,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

export const typography = {
  family: {
    heading: 'Montserrat',
    body: undefined as string | undefined,
  },
  size: {
    caption: 12,
    body: 14,
    bodyLg: 16,
    subtitle: 18,
    title: 22,
    headline: 28,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const elevation = {
  sm: {
    shadowColor: '#0D4D98',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#0D4D98',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lg: {
    shadowColor: '#0D4D98',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
} as const;

export const layout = {
  bottomTabInset: 50,
  maxContentWidth: 800,
  screenPadding: spacing.four,
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  elevation,
  layout,
} as const;

export type Theme = typeof theme;