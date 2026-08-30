/**
 * Entidad del dominio Calendario.
 *
 * Un evento representa una entrada en el calendario institucional. Se divide
 * en dos naturalezas:
 *  - OFICIAL: creado por ADMIN o COMUNICADOR (este último solo para su
 *    propio decanato). Se difunde a una audiencia. Notifica al resto de
 *    usuarios afectados vía fan-out.
 *  - PERSONAL: creado por cualquier usuario autenticado. Solo visible para
 *    su dueño.
 *
 * El campo `usuario_id` siempre está presente: es el "propietario/creador"
 * del evento, lo que permite que un COMUNICADOR edite/elimine los oficiales
 * que él mismo creó sin necesidad de un campo `creado_por` separado.
 */
export const TIPOS_EVENTO = ['OFICIAL', 'PERSONAL'] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export interface Evento {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: TipoEvento;
  usuarioId: string;
  inicioAt: Date;
  finAt: Date | null;
  diaCompleto: boolean;
  recordatorioMinutos: number | null;
  createdAt: Date;
  /** Solo aplica a eventos OFICIALES; `[]` = GLOBAL. */
  decanatoIds: number[];
}

export interface CrearEventoInput {
  titulo: string;
  descripcion?: string | null;
  tipo: TipoEvento;
  /** ISO 8601 string (validado por Zod en la capa HTTP). */
  inicioAt: string;
  finAt?: string | null;
  diaCompleto?: boolean;
  recordatorioMinutos?: number | null;
  /** Audiencia: aplica solo a OFICIAL; `[]` = GLOBAL. */
  decanatoIds?: number[];
}

/** No se permite cambiar el tipo de un evento (semánticamente incompatible). */
export type EditarEventoInput = Partial<Omit<CrearEventoInput, 'tipo'>>;
