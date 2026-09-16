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

export interface MateriaActualDTO extends MateriaBase {
  es_actual: true;
  profesor: string;
  aula: string;
  horario: string;
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
