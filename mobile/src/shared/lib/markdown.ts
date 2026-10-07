/**
 * Helpers Markdown puros (para presentaciones del feed/detalle).
 * `excerpt`: primer párrafo no vacío del cuerpo Markdown, despojado de
 * sintaxis (headings, énfasis, links, imágenes, quotes, listas) → texto
 * plano para el lead del detalle. Truncado suave a `maxChars` (default
 * 160) con '…' si el párrafo es más largo.
 */
const MAX_CHARS_DEFECTO = 160;
const PUNTOS_SUSPENSIVOS = '…';

export function excerpt(md: string, maxChars: number = MAX_CHARS_DEFECTO): string {
  const parrafo = md
    .split(/\n\n+/) // párrafo separado por línea vacía
    .map((b) => b.trim())
    .find(Boolean);

  if (!parrafo) return '';

  const plano = parrafo
    .replace(/^#{1,6}\s+/gm, '') // headings
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // imágenes → alt
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → texto
    .replace(/^>\s?/gm, '') // blockquotes
    .replace(/^\s*[-*+]\s+/gm, '') // listas
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // strong
    .replace(/(\*|_)(.*?)\1/g, '$2') // énfasis
    .replace(/`([^`]*)`/g, '$1') // código
    .replace(/\s+/g, ' ') // espacios colapsados
    .trim();

  if (plano.length <= maxChars) return plano;
  return `${plano.slice(0, maxChars).trimEnd()}${PUNTOS_SUSPENSIVOS}`;
}
