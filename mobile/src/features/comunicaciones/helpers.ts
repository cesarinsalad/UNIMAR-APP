/**
 * Presentación de la audiencia de un comunicado.
 *
 * Regla de dominio (contrato §5): `decanatoIds: []` significa GLOBAL —
 * dirigido a toda la universidad. Con decanatos listados, solo a ellos.
 */
export { etiquetaAudiencia } from '@/shared/lib/etiquetas';

/**
 * Chip de estado, solo visible si el comunicado no está PUBLICADO (decisión
 * de diseño del 3b: un chip PUBLICADO en el feed público sería ruido).
 * Devuelve null para indicar "no renderizar chip".
 */
import type { EstadoComunicado } from './types';

export function chipEstado(estado: EstadoComunicado): string | null {
  switch (estado) {
    case 'BORRADOR':
      return 'Borrador';
    case 'PENDIENTE':
      return 'En revisión';
    case 'ARCHIVADO':
      return 'Archivado';
    case 'PUBLICADO':
      return null;
  }
}

/**
 * El "rechazado" de la máquina editorial DERIVADO del wire real: el BFF
 * no tiene estado RECHAZADO — rechazar devuelve a BORRADOR con motivo.
 * True solo si el BORRADOR lleva motivoRechazo: en la consola se muestra
 * con el badge "Devuelto" y entra en su propia cola.
 */
export function esDevuelto(comunicado: {
  estado: EstadoComunicado;
  motivoRechazo: string | null;
}): boolean {
  return comunicado.estado === 'BORRADOR' && comunicado.motivoRechazo !== null;
}

/**
 * Los borradores pertenecen solo a su autor; ningún otro rol (incluido
 * ADMIN) debe ver borradores ajenos en la cola hasta que estén en revisión.
 */
export function visibleEnColaGestion(
  comunicado: { estado: EstadoComunicado; autorId: string },
  usuarioId: string | null | undefined,
): boolean {
  return comunicado.estado !== 'BORRADOR' || comunicado.autorId === usuarioId;
}


/** Etiquetas de categoría editorial (wire snake, muestra Title Case). */
const ETIQUETAS_CATEGORIA: Record<string, string> = {
  ACADEMICO: 'Académico',
  EVENTO: 'Eventos',
  INSTITUCIONAL: 'Institucional',
};

/**
 * Etiqueta del chip de categoría de una noticia: su `categoria` si tiene;
 * si no, la etiqueta de audiencia (Decanato N / Toda la universidad).
 */
import { etiquetaAudiencia } from '@/shared/lib/etiquetas';

export function etiquetaCategoria(comunicado: {
  categoria: string | null;
  decanatoIds: number[];
}): string {
  if (!comunicado.categoria) return etiquetaAudiencia(comunicado.decanatoIds);
  return ETIQUETAS_CATEGORIA[comunicado.categoria] ?? 'Comunicado';
}

export type EstadoCargaPortada = 'imagen' | 'cargando' | 'vacia';

/**
 * Estado del slot de portada. La URL firmada llega después del comunicado:
 * mientras no existe se pinta un skeleton, nunca el placeholder de "sin
 * imagen" (mentiría). Con URL cacheada un refetch no vuelve al skeleton.
 * `fallo` es el onError de la propia Image: si falla, se cae al placeholder.
 */
export function estadoCargaPortada({
  url,
  cargando,
  fallo = false,
}: {
  url?: string;
  cargando: boolean;
  fallo?: boolean;
}): EstadoCargaPortada {
  if (url && !fallo) return 'imagen';
  if (cargando) return 'cargando';
  return 'vacia';
}