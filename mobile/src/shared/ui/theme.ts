/**
 * Design tokens UNIMARapp.
 * Implementación ejecutable de /STYLE.md en la raíz del repo.
 * La guía de diseño es la fuente de verdad; este archivo la materializa.
 *
 * Estructura semántica espejo de los estilos de Figma:
 * - brand: color corporativo y sus acompañantes
 * - bg / border / text: superficies, neutros y tipografía
 * - accent: uso restringido a urgencias
 * - status: estados de datos (no de marca)
 *
 * Los alias legacy (background, grayLight, etc.) se mantienen para
 * consumidores existentes y se migrarán pantalla por pantalla.
 */

export const colors = {
  brand: {
    primary: '#0D4D98',
    onPrimary: '#FFFFFF',
    surfaceBlue: '#EBF2FA',
  },
  bg: {
    canvas: '#F8F9FA',
    surface: '#FFFFFF',
  },
  border: {
    subtle: '#E8E8E8',
    strong: '#D1D1D4',
  },
  text: {
    primary: '#413D3C',
    secondary: '#7A7574',
    tertiary: '#7A7574', // alias legacy: se migrará a `secondary`
    onPrimary: '#FFFFFF',
  },
  accent: {
    urgent: '#FF7A00',
  },
  status: {
    success: '#2E7D32',
    warning: '#FF7A00',
    danger: '#C62828',
  },
  white: '#FFFFFF',

  // Alias legacy (migrar a tokens semánticos, luego eliminar)
  primary: '#0D4D98',
  grayLight: '#E8E8E8',
  grayDark: '#413D3C',
  background: {
    base: '#FFFFFF',
    elevated: '#EBF2FA',
    sunken: '#EEEEF1',
  },
} as const;

export const spacing = {
  zero: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,

  // Alias legacy (migrar a xs/sm/md/lg/xl, luego eliminar)
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
  /** Botones e interactivos (regla STYLE.md: múltiplos de 4). */
  button: 16,
  /** Campos de texto. */
  input: 12,
  /** Tarjetas. */
  card: 20,
  pill: 999,
} as const;

/**
 * Nombres de fuente Montserrat (cargadas en app/_layout.tsx con
 * @expo-google-fonts/montserrat). Si la carga falla, RN cae a la
 * fuente por defecto.
 */
export const fontFamily = {
  regular: 'Montserrat_400Regular',
  medium: 'Montserrat_500Medium',
  semibold: 'Montserrat_600SemiBold',
  bold: 'Montserrat_700Bold',
} as const;

export const typography = {
  family: {
    heading: fontFamily.semibold,
    body: fontFamily.regular,
  },
  size: {
    caption: 12,
    bodySm: 14,
    body: 16,
    subtitle: 18,
    title: 22,
    headline: 28,

    // Alias legacy
    bodyLg: 16,
  },
  /** Interlineado explícito por variante (px), según STYLE.md §2.1. */
  lineHeight: {
    caption: 16,
    bodySm: 20,
    body: 24,
    subtitle: 24,
    title: 28,
    headline: 34,

    // Alias legacy (multiplicadores usados antes de este cambio)
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

/**
 * Sombras neutras (negro), aproximación RN de los estilos de Figma
 * (STYLE.md §4). El inner shadow de iluminación se simula en los
 * componentes con un borde/desfase superior claro.
 */
export const elevation = {
  sm: {
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  lg: {
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
} as const;

/** Desfase de iluminación superior que acompaña a cada nivel de sombra. */
export const highlight = {
  sm: { borderColor: '#FFFFFF4D', borderTopWidth: 1 },
  md: { borderColor: '#FFFFFF73', borderTopWidth: 1 },
  lg: { borderColor: '#FFFFFFA6', borderTopWidth: 1 },
} as const;

export const touchTarget = { min: 44 } as const;

export const layout = {
  bottomTabInset: 88,
  maxContentWidth: 800,
  screenPadding: spacing.lg,
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  fontFamily,
  typography,
  elevation,
  highlight,
  touchTarget,
  layout,
} as const;

export type Theme = typeof theme;
