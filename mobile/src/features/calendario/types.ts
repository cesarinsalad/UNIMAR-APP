/** Espejo del wire de /eventos (camelCase, fechas ISO-string). */
export type TipoEvento = 'OFICIAL' | 'PERSONAL' | 'INSTITUCIONAL' | 'FERIADO';

export const TIPOS_EVENTO: readonly TipoEvento[] = [
  'OFICIAL',
  'PERSONAL',
  'INSTITUCIONAL',
  'FERIADO',
] as const;

export interface Evento {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: TipoEvento;
  /** Creador/dueño: PERSONAL solo lo ve él; OFICIAL editable por él o ADMIN. */
  usuarioId: string;
  inicioAt: string;
  finAt: string | null;
  diaCompleto: boolean;
  recordatorioMinutos: number | null;
  /** Ubicación opcional (aula, sala, edificio). */
  lugar: string | null;
  createdAt: string;
  /** Audiencia (solo OFICIAL); [] = GLOBAL. */
  decanatoIds: number[];
  /** True si el usuario lo agregó a su agenda (pivot participar). */
  participo: boolean;
}

export interface FiltroEventos {
  /** Rango obligatorio del contrato (máx 90 días). */
  desde: string;
  hasta: string;
  /**
   * 'agregados': solo PERSONAL propios + OFICIALES que el usuario agregó
   * a su agenda + INSTITUCIONAL (la tab Agenda). Default 'todos'.
   */
  incluirOficiales?: 'todos' | 'agregados';
  limit: number;
  offset: number;
}