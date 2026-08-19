import { randomUUID } from 'node:crypto';

/**
 * Entidad Adjunto del componente Comunicaciones.
 *
 * Representa un archivo adjunto a un comunicado. El contenido binario vive en
 * Supabase Storage; la base de datos solo guarda los metadatos y el path para
 * poder generar URLs firmadas desde el BFF.
 */
export const BUCKET_ADJUNTOS = 'comunicado-adjuntos';

export const MIMES_PERMITIDOS = [
  'application/pdf',
  'image/png',
  'image/jpeg',
] as const;

export type MimePermitido = (typeof MIMES_PERMITIDOS)[number];

/** 5 MB, validado a nivel de metadatos (la URL firmada no inspecciona bytes). */
export const MAX_TAMANO_ADJUNTO_BYTES = 5 * 1024 * 1024;

export interface Adjunto {
  id: string;
  comunicadoId: string;
  storagePath: string;
  nombre: string;
  mimeType: string;
  createdAt: Date;
}

export interface CrearAdjuntoInput {
  comunicadoId: string;
  storagePath: string;
  nombre: string;
  mimeType: string;
}

/**
 * Genera un path único y seguro dentro del bucket.
 *
 * El prefijo `comunicadoId/` garantiza que no se pueda registrar un adjunto de
 * otro comunicado simplemente adivinando un path (defensa en profundidad).
 */
export function construirStoragePath(comunicadoId: string, nombre: string): string {
  const seguro = nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);
  return `${comunicadoId}/${randomUUID()}-${seguro || 'adjunto'}`;
}
