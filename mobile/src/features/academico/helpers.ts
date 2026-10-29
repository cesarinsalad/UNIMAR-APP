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

/** Abreviatura de 3 letras en el registro UNIMAR (4 → "Jue"), mismo
 *  vocabulario que usa el `horario` de la API y el membrete del grid. */
export function abrevDia(diaSemana: number): string {
  return nombreDia(diaSemana).slice(0, 3);
}

/** Día ISO-8601 de hoy (1=lun … 7=dom): la conversión de getDay() que
 *  antes quedó inline en proxima-clase.ts y clases-de-dia.ts. */
export function diaIsoHoy(): number {
  const diaJs = new Date().getDay();
  return diaJs === 0 ? 7 : diaJs;
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

export interface GrupoPeriodo {
  /** Clave wire cruda ("2025-2"); la UI la etiqueta con `formatearPeriodo`. */
  periodo: string;
  materias: MateriaHistoricaDTO[];
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

/**
 * Σ de ponderaciones de los cortes ya calificados — "Cuánto del 100% aún
 * pesa la nota abierta" (Corte 1 con nota en un plan 40/60 → 40).
 */
export function ponderacionEvaluada(cortes: CorteDTO[]): number {
  let suma = 0;
  for (const corte of cortes) {
    if (corte.nota !== null) suma += corte.ponderacion;
  }
  return suma;
}

/**
 * true si el acta está COMPLETA: todos los cortes calificados y sus
 * ponderaciones suman 100 (plan UNIMAR: Corte 1 · 40% + Corte 2 · 60%).
 * Con la acta cerrada la UI cambia "Nota acumulada" por "Nota final":
 * el número deja de ser proyección y pasa a ser definitivo.
 */
export function esNotaCerrada(cortes: CorteDTO[]): boolean {
  return (
    cortes.length > 0 &&
    cortes.every((corte) => corte.nota !== null) &&
    cortes.reduce((suma, corte) => suma + corte.ponderacion, 0) === 100
  );
}

/** Estado verbal de la nota, mismo criterio que `colorNota` (aprobado ≥ 10). */
export function palabraNota(nota: number | null): string {
  switch (colorNota(nota)) {
    case 'success':
      return 'aprobada';
    case 'danger':
      return 'reprobada';
    case 'muted':
      return 'sin calificar';
  }
}

/**
 * Voz accesible de una nota para screen readers: cifra + estado verbal
 * ("16 puntos, aprobada"; "Sin nota") — el usuario de VoiceOver escucha
 * el estado además del número, sin depender del color.
 */
export function etiquetaAccesibleNota(nota: number | null): string {
  if (nota === null) return 'Sin nota';
  return `${Math.trunc(nota)} puntos, ${palabraNota(nota)}`;
}

const TRIMESTRES: Record<string, string> = {
  '1': 'Enero-Abril',
  '2': 'Abril-Julio',
  '3': 'Septiembre-Diciembre',
};

/**
 * Etiqueta de período para la UI: "2026-2" → "Trimestre Abril-Julio 2026"
 * (tríada UNIMAR). El término "0" es el intensivo de Agosto. Formatos
 * ajenos se muestran crudos en vez de inventar.
 */
export function formatearPeriodo(periodo: string): string {
  const anio = periodo.split('-')[0] ?? '';
  const termino = periodo.split('-')[1] ?? '';
  if (termino === '0') return `Agosto (Intensivo) ${anio}`;
  const etiqueta = TRIMESTRES[termino];
  if (!etiqueta) return periodo;
  return `Trimestre ${etiqueta} ${anio}`;
}

/**
 * Partes del período wire para el ancla del acordeón de historial: año
 * ("2026") y término legible ("Abril-Julio"); `termino === null` para
 * formatos ajenos — el acordeón cae a su etiqueta plana anterior.
 */
export function partesPeriodo(periodo: string): {
  anio: string;
  termino: string | null;
} {
  const anio = periodo.split('-')[0] ?? '';
  const termino = periodo.split('-')[1] ?? '';
  const etiqueta =
    termino === '0' ? 'Agosto (Intensivo)' : TRIMESTRES[termino];
  return { anio, termino: etiqueta ?? null };
}

/** Agrupa materias por período wire ("2026-2"); índice interno del año. */
function agruparPorPeriodo(historicas: MateriaHistoricaDTO[]): GrupoPeriodo[] {
  const mapa = new Map<string, MateriaHistoricaDTO[]>();
  for (const materia of historicas) {
    const grupo = mapa.get(materia.periodo) ?? [];
    grupo.push(materia);
    mapa.set(materia.periodo, grupo);
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([periodo, materias]) => ({ periodo, materias }));
}

export interface GrupoAno {
  /** Año lectivo ("2026"); ancla de sección no interactiva en la UI. */
  anio: string;
  grupos: GrupoPeriodo[];
}

/**
 * Historial indexado por año para la tab Clases: años descendentes
 * ("2026" antes que "2025") y, dentro de cada año, períodos descendentes
 * ("2026-2" antes que "2026-1"); materias en el orden original de la wire.
 */
export function agruparHistoriasPorAno(
  historicas: MateriaHistoricaDTO[],
): GrupoAno[] {
  const porAno = new Map<string, MateriaHistoricaDTO[]>();
  for (const materia of historicas) {
    const anio = materia.periodo.split('-')[0] ?? '';
    const materiasAno = porAno.get(anio) ?? [];
    materiasAno.push(materia);
    porAno.set(anio, materiasAno);
  }
  return [...porAno.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([anio, materias]) => ({ anio, grupos: agruparPorPeriodo(materias) }));
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
