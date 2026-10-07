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

/** Categoría editorial del comunicado (nullable: sin categoría). */
export const CATEGORIAS = ['ACADEMICO', 'EVENTO', 'INSTITUCIONAL'] as const;
export type Categoria = (typeof CATEGORIAS)[number];

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
  /** Ruta del asset de portada en el bucket de adjuntos (image/png|jpeg,
   *  registrado como adjunto del propio comunicado). null = sin portada. */
  imagenPath: string | null;
  /** Pie/caption de la portada (≤200 chars). null = sin pie. */
  imagenPie: string | null;
  /** Categoría editorial; null = sin categoría (los chips no la muestran). */
  categoria: Categoria | null;
  /** Nombre para mostrar del autor (JOIN usuarios en el repo). */
  autorNombre: string;
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
  categoria?: string | null;
}

/** Input para editar: todos los campos son opcionales, mínimo uno. */
export type EditarComunicadoInput = Partial<CrearComunicadoInput>;
