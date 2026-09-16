/**
 * Espejo del wire real de /comunicados (camelCase, fechas ISO-string).
 * Ver migración comunicaciones_base + comunicadosRoutes: la capa HTTP del BFF
 * serializa la entidad de dominio directamente.
 */
export type EstadoComunicado = 'BORRADOR' | 'PENDIENTE' | 'PUBLICADO' | 'ARCHIVADO';

export const ESTADOS_COMUNICADO: readonly EstadoComunicado[] = [
  'BORRADOR',
  'PENDIENTE',
  'PUBLICADO',
  'ARCHIVADO',
] as const;

export interface Comunicado {
  id: string;
  titulo: string;
  cuerpo: string;
  autorId: string;
  estado: EstadoComunicado;
  aprobadoPor: string | null;
  motivoRechazo: string | null;
  publicadoAt: string | null;
  programadoPara: string | null;
  expiraAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Audiencia; [] = GLOBAL (toda la universidad). */
  decanatoIds: number[];
}

/** Espejo del wire de /adjuntos (camelCase, ver Notificacion). */
export interface Adjunto {
  id: string;
  comunicadoId: string;
  storagePath: string;
  nombre: string;
  mimeType: string;
  createdAt: string;
}

/** Espejo de MIMES_PERMITIDOS del dominio backend. */
export const MIMES_PERMITIDOS = [
  'application/pdf',
  'image/png',
  'image/jpeg',
] as const;

export type MimePermitido = (typeof MIMES_PERMITIDOS)[number];

/** Espejo de MAX_TAMANO_ADJUNTO_BYTES del dominio backend. */
export const MAX_TAMANO_ADJUNTO_BYTES = 5 * 1024 * 1024;
/** Umbral para la UI: ABOVE este tamaño resultará en 400 severido. */
export const TAMANO_MAX_MB = 5;