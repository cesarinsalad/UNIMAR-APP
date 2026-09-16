import type {
  EstadoHistorica,
  MateriaDTO,
  MateriaActualDTO,
  MateriaHistoricaDTO,
} from './types';

/** Escala UNIMAR 0–20: aprobado desde 10. */
export const NOTA_MINIMA_APROBADA = 10;

export type TonoNota = 'success' | 'danger' | 'muted';

/**
 * Semáforo de nota: null (aún sin calificar) en gris; el resto por umbral.
 * Las reprobadas y retiradas se colorean por `nota_final`, no por estado,
 * para no duplicar la señal del badge.
 */
export function colorNota(nota: number | null): TonoNota {
  if (nota === null) return 'muted';
  return nota >= NOTA_MINIMA_APROBADA ? 'success' : 'danger';
}

const ETIQUETAS_ESTADO: Record<EstadoHistorica, string> = {
  APROBADA: 'Aprobada',
  REPROBADA: 'Reprobada',
  RETIRADA: 'Retirada',
};

export function etiquetaEstadoHistorica(estado: EstadoHistorica): string {
  return ETIQUETAS_ESTADO[estado];
}

export interface MateriasParticionadas {
  actuales: MateriaActualDTO[];
  historicas: MateriaHistoricaDTO[];
}

/**
 * Estrecha la unión por el discriminador `es_actual` — una sola fuente para
 * los chips de conteo y las listas. El `if` es lo que activa el narrowing
 * de TypeScript; el helper solo existe para no duplicar el `filter`.
 */
export function particionarMaterias(materias: MateriaDTO[]): MateriasParticionadas {
  const actuales: MateriaActualDTO[] = [];
  const historicas: MateriaHistoricaDTO[] = [];
  for (const materia of materias) {
    if (materia.es_actual) {
      actuales.push(materia);
    } else {
      historicas.push(materia);
    }
  }
  return { actuales, historicas };
}

/**
 * Períodos distintos presentes en el historial, ordenados descendente
 * ("2025-2" antes que "2025-1"): alimenta el selector de período.
 */
export function periodosDisponibles(historicas: MateriaHistoricaDTO[]): string[] {
  const unicos = new Set(historicas.map((m) => m.periodo));
  return [...unicos].sort().reverse();
}

export function filtrarPorPeriodo(
  historicas: MateriaHistoricaDTO[],
  periodo: string | null,
): MateriaHistoricaDTO[] {
  if (periodo === null) return historicas;
  return historicas.filter((m) => m.periodo === periodo);
}
