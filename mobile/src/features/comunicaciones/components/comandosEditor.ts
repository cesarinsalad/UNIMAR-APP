/** Comandos comunes al editor visual y al modo Markdown. */
export type ComandoEditor =
  | 'negrita'
  | 'cursiva'
  | 'tachado'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'vinetas'
  | 'numerada'
  | 'indentar'
  | 'desindentar'
  | 'enlace'
  | 'alternarMarkdown';

export type EstadosComandos = Partial<Record<ComandoEditor, boolean>>;
