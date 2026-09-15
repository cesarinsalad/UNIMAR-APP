import type { Notificacion } from '../types';

/** Tamaño de página fijo (coincide con el default del contrato: 20). */
export const PAGE_SIZE_NOTIFICACIONES = 20;

/**
 * Paginación del BFF: offset/limit sobre un arreglo plano (sin `total`).
 * Mientras la página llegue completa asumimos que hay más; una página
 * incompleta, vacía o exactamente en el límite legal (≤100) cierra el ciclo.
 */
export function calcularSiguienteOffset(
  pagina: Notificacion[],
  offset: number,
): number | undefined {
  if (pagina.length < PAGE_SIZE_NOTIFICACIONES) return undefined;
  return offset + pagina.length;
}