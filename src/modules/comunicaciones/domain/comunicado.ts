/**
 * Entidad del dominio Comunicaciones.
 *
 * Un comunicado es el mensaje institucional (aviso, circular, noticia) que
 * publica un comunicador o el admin. Su contenido (`cuerpo`) se almacena en
 * Markdown, lo que permite negritas, listas y enlaces sin la complejidad ni
 * riesgo de seguridad de HTML.
 */
export const ESTADOS = ['BORRADOR', 'PENDIENTE', 'PUBLICADO', 'ARCHIVADO'] as const;
export type Estado = (typeof ESTADOS)[number];

/** Estados en los que se pueden agregar, editar o eliminar adjuntos. */
export const ESTADOS_EDITABLES: Estado[] = ['BORRADOR', 'PUBLICADO'];

export interface Comunicado {
  id: string;
  titulo: string;
  cuerpo: string;
  autorId: string;
  estado: Estado;
  aprobadoPor: string | null;
  motivoRechazo: string | null;
  publicadoAt: Date | null;
  programadoPara: Date | null;
  expiraAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  decanatoIds: number[]; // audiencia; [] = GLOBAL
}

/** Input para crear un comunicado (viene validado por Zod en la capa HTTP). */
export interface CrearComunicadoInput {
  titulo: string;
  cuerpo: string;
  decanatoIds: number[];
  programadoPara?: string | null;
  expiraAt?: string | null;
}

/** Input para editar: todos los campos son opcionales, mínimo uno. */
export type EditarComunicadoInput = Partial<CrearComunicadoInput>;
