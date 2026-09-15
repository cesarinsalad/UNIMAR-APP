import { siguienteOffset } from '@/shared/lib/paginar';

/** Tamaño de página fijo (coincide con el default del contrato: 20). */
export const PAGE_SIZE_NOTIFICACIONES = 20;

/**
 * Paginación de la bandeja: wrapper fino sobre el helper genérico de
 * shared/lib (ver `siguienteOffset` para la semántica de fin de lista).
 */
export function calcularSiguienteOffset(
  pagina: unknown[],
  offset: number,
): number | undefined {
  return siguienteOffset(pagina, offset, PAGE_SIZE_NOTIFICACIONES);
}