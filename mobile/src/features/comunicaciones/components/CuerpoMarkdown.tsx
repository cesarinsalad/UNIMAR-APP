import Markdown from 'react-native-markdown-display';

import { colors, radius, spacing, typography } from '@/shared/ui';

/**
 * Tema Markdown mapeado a los tokens de marca (STYLE.md):
 * textos en Gris Oscuro, links en Azul Corporativo, blockquote con borde
 * izquierdo azul, código monoespaciado sobre fondo sunken. El naranja nunca
 * va en tipografía (STYLE.md §1).
 */
const estilosMarkdown = {
  body: {
    color: colors.text.primary,
    fontSize: typography.size.bodyLg,
    lineHeight: typography.size.bodyLg * typography.lineHeight.normal,
  },
  heading1: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginTop: spacing.six,
    marginBottom: spacing.two,
  },
  heading2: {
    fontSize: typography.size.subtitle,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginTop: spacing.five,
    marginBottom: spacing.two,
  },
  strong: { color: colors.text.primary },
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
