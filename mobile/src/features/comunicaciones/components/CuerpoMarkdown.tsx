import Markdown from 'react-native-markdown-display';

import { colors, fontFamily, radius, spacing, typography } from '@/shared/ui';

/**
 * Tema Markdown mapeado a los tokens de marca (STYLE.md):
 * toda la tipografía es Montserrat (la misma de ThemedText en el resto
 * del app) — sin `fontFamily` el cuerpo caería a la fuente del sistema
 * y cada bloque con formato se vería distinto entre sí. Textos en Gris
 * Oscuro, links en Azul Corporativo, blockquote con borde izquierdo
 * azul, código monoespaciado sobre fondo sunken (monospace sí es
 * intencional: es la convención para código). El naranja nunca va en
 * tipografía (STYLE.md §1).
 */
const estilosMarkdown = {
  body: {
    color: colors.text.primary,
    fontFamily: typography.family.body,
    fontSize: typography.size.bodyLg,
    lineHeight: typography.size.bodyLg * typography.lineHeight.normal,
  },
  heading1: {
    fontSize: typography.size.title,
    fontFamily: fontFamily.bold,
    color: colors.text.primary,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  heading2: {
    fontSize: typography.size.subtitle,
    fontFamily: typography.family.heading,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginTop: 20,
    marginBottom: spacing.sm,
  },
  heading3: {
    fontSize: typography.size.bodyLg,
    fontFamily: typography.family.heading,
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  heading4: {
    fontSize: typography.size.bodyLg,
    fontFamily: typography.family.heading,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  heading5: {
    fontSize: typography.size.bodyLg,
    fontFamily: typography.family.heading,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  heading6: {
    fontSize: typography.size.bodyLg,
    fontFamily: typography.family.heading,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  strong: { color: colors.text.primary, fontFamily: typography.family.heading },
  em: { fontStyle: 'italic' },
  bullet_list: { marginTop: spacing.sm, marginBottom: spacing.sm },
  ordered_list: { marginTop: spacing.sm, marginBottom: spacing.sm },
  list_item: { marginTop: spacing.xs },
  link: { color: colors.brand.primary, textDecorationLine: 'underline' },
  blockquote: {
    backgroundColor: colors.brand.surfaceBlue,
    borderLeftWidth: 3,
    borderLeftColor: colors.brand.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    marginVertical: spacing.sm,
  },
  code_inline: {
    backgroundColor: colors.bg.sunken,
    color: colors.text.primary,
    fontFamily: 'monospace',
  },
  fence: {
    backgroundColor: colors.bg.sunken,
    color: colors.text.primary,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  hr: {
    backgroundColor: colors.border.subtle,
    height: 1,
    marginVertical: spacing.md,
  },
} as const;

/** Render del cuerpo Markdown con el tema corporativo UNIMAR. */
export function CuerpoMarkdown({ cuerpo }: { cuerpo: string }) {
  return <Markdown style={estilosMarkdown}>{cuerpo}</Markdown>;
}
