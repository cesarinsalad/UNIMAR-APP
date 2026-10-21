/**
 * Espejo exacto del wire de /academico (ver dtos.ts del BFF).
 *
 * ATENCIÓN — nomenclatura mixta del contrato, copiada literal:
 *  - snake_case: `es_actual`, `nota_final`
 *  - camelCase: `semestreSugerido` (pénsum, 5c), `tipoSangre` (historial, 5d)
 * No "normalizar": los tipos deben romperse en compilación si el wire cambia.
 */

export interface CorteDTO {
  nombre: string;
  /** ISO 8601. */
  fecha: string;
  /** 0–100. */
  ponderacion: number;
  /** Escala UNIMAR 0–20; null = aún sin calificar. */
  nota: number | null;
}

interface MateriaBase {
  id: string;
  codigo: string;
  nombre: string;
  creditos: number;
}

/**
 * Franja horaria individual de una materia en curso (una por día de la
 * semana, con aula y horario propios). Opcional: la API UNIMAR real aún
 * no la envía; presente en el mock.
 */
export interface FranjaDTO {
  /** ISO-8601: 1=lun … 7=dom. */
  dia_semana: number;
  aula: string;
  /** "HH:MM" local 24h. */
  hora_inicio: string;
  hora_fin: string;
}

export interface MateriaActualDTO extends MateriaBase {
  es_actual: true;
  profesor: string;
  aula: string;
  horario: string;
  /** Horario estructurado opcional (ISO-8601: 1=lun … 7=dom). Ausente en la
   *  API UNIMAR real; presente en el mock → habilita el cálculo de próxima
   *  clase. Horas "HH:MM" locales 24h. */
  dias_semana?: number[];
  hora_inicio?: string;
  hora_fin?: string;
  seccion?: string;
  /** Franjas exactas por día. Si están, tienen prioridad sobre
   *  `dias_semana`/`hora_inicio` para próxima clase y aula. */
  franjas?: FranjaDTO[];
  cortes: CorteDTO[];
}

export type EstadoHistorica = 'APROBADA' | 'REPROBADA' | 'RETIRADA';

export interface MateriaHistoricaDTO extends MateriaBase {
  es_actual: false;
  periodo: string;
  nota_final: number | null;
  estado: EstadoHistorica;
}

export type MateriaDTO = MateriaActualDTO | MateriaHistoricaDTO;

export type EstatusAcademico = 'ACTIVO' | 'INACTIVO' | 'GRADUADO' | 'EGRESADO';

export interface PerfilAcademico {
  cedula: string;
  nombre: string;
  carrera: string;
  semestre: number;
  promedio: number | null;
  estatus: EstatusAcademico;
}

/**
 * Historial médico (wire camelCase: `tipoSangre`).
 * Recurso sensible: el BFF nunca lo cachea y solo lo sirve al propio
 * estudiante (403 al resto, incluido ADMIN). Solo lectura en v1 — la
 * edición requeriría endpoint de escritura contra UNIMAR (mejora futura).
 */
export interface VacunaDTO {
  nombre: string;
  /** ISO 8601. */
  fecha: string;
}

export interface HistorialMedicoDTO {
  cedula: string;
  tipoSangre: string;
  alergias: string[];
  vacunas: VacunaDTO[];
}

/**
 * Pénsum (wire camelCase: `semestreSugerido`). OJO — dominio UNIMAR:
 * la universidad trabaja por TRIMESTRES, no semestres; el campo del
 * contrato se llama así pero la UI etiqueta "Trimestre N".
 */
export interface PensumMateriaDTO {
  codigo: string;
  nombre: string;
  creditos: number;
  semestreSugerido: number;
  prerequisitos: string[];
}

export interface PensumDTO {
  carrera: string;
  materias: PensumMateriaDTO[];
}
