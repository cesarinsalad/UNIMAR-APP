import type {
  CorteDTO,
  EstadoHistorica,
  MateriaDTO,
  MateriaActualDTO,
  MateriaHistoricaDTO,
  PensumMateriaDTO,
} from './types';

const NOMBRES_DIA: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
};

/** Etiqueta del día ISO-8601 de una franja (4 → "Jueves"). */
export function nombreDia(diaSemana: number): string {
  return NOMBRES_DIA[diaSemana] ?? '';
}

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

/**
 * "Acumulada" de una materia en curso: promedio ponderado de los cortes ya
 * calificados (Σ nota·pond / Σ pond de los calificados), truncado a entero
 * como acuerda la UI (15,2 → 15). Sin cortes calificados → null.
 */
export function notaAcumulada(cortes: CorteDTO[]): number | null {
  let suma = 0;
  let pond = 0;
  for (const corte of cortes) {
    if (corte.nota === null) continue;
    suma += corte.nota * corte.ponderacion;
    pond += corte.ponderacion;
  }
  if (pond <= 0) return null;
  return Math.trunc(suma / pond);
}

/** Nota con 2 dígitos para la columna "Acumulada" (9 → "09"); null → "—". */
export function formatoNota2(nota: number | null): string {
  if (nota === null) return '—';
  return Math.trunc(nota).toString().padStart(2, '0');
}

const TRIMESTRES: Record<string, string> = {
  '1': 'Enero-Abril',
  '2': 'Abril-Julio',
  '3': 'Septiembre-Diciembre',
};

/**
 * Etiqueta de período para la UI: "2026-2" → "Trimestre Abril-Julio 2026"
 * (tríada UNIMAR). Formatos ajenos (p. ej. "2025-2" tras cambio futuro del
 * contrato) se muestran crudos en vez de inventar.
 */
export function formatearPeriodo(periodo: string): string {
  const anio = periodo.split('-')[0] ?? '';
  const termino = periodo.split('-')[1] ?? '';
  const etiqueta = TRIMESTRES[termino];
  if (!etiqueta) return periodo;
  return `Trimestre ${etiqueta} ${anio}`;
}

export function filtrarPorPeriodo(
  historicas: MateriaHistoricaDTO[],
  periodo: string | null,
): MateriaHistoricaDTO[] {
  if (periodo === null) return historicas;
  return historicas.filter((m) => m.periodo === periodo);
}

export interface PensumItem extends PensumMateriaDTO {
  /** true si el código coincide con una histórica APROBADA del estudiante. */
  aprobada: boolean;
}

export interface GrupoTrimestre {
  /** Número del período lectivo. La UI lo etiqueta "Trimestre N" (UNIMAR). */
  trimestre: number;
  items: PensumItem[];
}

/**
 * Cruce pénsum × historial: marca aprobadas por coincidencia de `codigo`.
 * Solo cuenta el estado APROBADA (reprobadas/retiradas siguen pendientes).
 */
export function marcarAprobadas(
  pensum: PensumMateriaDTO[],
  historicas: MateriaHistoricaDTO[],
): PensumItem[] {
  const aprobadas = new Set(
    historicas.filter((h) => h.estado === 'APROBADA').map((h) => h.codigo),
  );
  return pensum.map((materia) => ({
    ...materia,
    aprobada: aprobadas.has(materia.codigo),
  }));
}

/** Agrupa por `semestreSugerido` del contrato, ordenado ascendente. */
export function agruparPorTrimestre(items: PensumItem[]): GrupoTrimestre[] {
  const mapa = new Map<number, PensumItem[]>();
  for (const item of items) {
    const grupo = mapa.get(item.semestreSugerido) ?? [];
    grupo.push(item);
    mapa.set(item.semestreSugerido, grupo);
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => a - b)
    .map(([trimestre, grupoItems]) => ({ trimestre, items: grupoItems }));
}
