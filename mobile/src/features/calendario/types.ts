/** Espejo del wire de /eventos (camelCase, fechas ISO-string). */
export type TipoEvento = 'OFICIAL' | 'PERSONAL';

export const TIPOS_EVENTO: readonly TipoEvento[] = ['OFICIAL', 'PERSONAL'] as const;

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
  createdAt: string;
  /** Audiencia (solo OFICIAL); [] = GLOBAL. */
  decanatoIds: number[];
}

export interface FiltroEventos {
  /** Rango obligatorio del contrato (máx 90 días). */
  desde: string;
  hasta: string;
  limit: number;
  offset: number;
}