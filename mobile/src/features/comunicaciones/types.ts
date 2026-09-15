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