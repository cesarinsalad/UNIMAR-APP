/** Comandos del editor de comunicado (barra compartida entre móvil y web). */
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
  | 'enlace';

export type EstadosComandos = Partial<Record<ComandoEditor, boolean>>;
