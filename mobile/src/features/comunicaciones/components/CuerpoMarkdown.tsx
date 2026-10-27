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
    marginTop: spacing.six,
    marginBottom: spacing.two,
  },
  heading2: {
    fontSize: typography.size.subtitle,
    fontFamily: typography.family.heading,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginTop: spacing.five,
    marginBottom: spacing.two,
  },
  heading3: {
    fontSize: typography.size.bodyLg,
    fontFamily: typography.family.heading,
    color: colors.text.primary,
    marginTop: spacing.four,
    marginBottom: spacing.two,
  },
  heading4: {
    fontSize: typography.size.bodyLg,
    fontFamily: typography.family.heading,
    color: colors.text.primary,
    marginTop: spacing.three,
    marginBottom: spacing.two,
  },
  heading5: {
    fontSize: typography.size.bodyLg,
    fontFamily: typography.family.heading,
    color: colors.text.primary,
    marginTop: spacing.three,
    marginBottom: spacing.two,
  },
  heading6: {
    fontSize: typography.size.bodyLg,
    fontFamily: typography.family.heading,
    color: colors.text.primary,
    marginTop: spacing.three,
    marginBottom: spacing.two,
  },
  strong: { color: colors.text.primary, fontFamily: typography.family.heading },
  em: { fontStyle: 'italic' },
  bullet_list: { marginTop: spacing.two, marginBottom: spacing.two },
  ordered_list: { marginTop: spacing.two, marginBottom: spacing.two },
  list_item: { marginTop: spacing.one },
  link: { color: colors.primary, textDecorationLine: 'underline' },
  blockquote: {
    backgroundColor: colors.background.elevated,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingHorizontal: spacing.three,
    paddingVertical: spacing.two,
    borderRadius: radius.sm,
    marginVertical: spacing.two,
  },
  code_inline: {
    backgroundColor: colors.background.sunken,
    color: colors.grayDark,
    fontFamily: 'monospace',
  },
  fence: {
    backgroundColor: colors.background.sunken,
    color: colors.grayDark,
    borderRadius: radius.sm,
    padding: spacing.two,
  },
  hr: {
    backgroundColor: colors.border.subtle,
    height: 1,
    marginVertical: spacing.three,
  },
} as const;

/** Render del cuerpo Markdown con el tema corporativo UNIMAR. */
export function CuerpoMarkdown({ cuerpo }: { cuerpo: string }) {
  return <Markdown style={estilosMarkdown}>{cuerpo}</Markdown>;
}
