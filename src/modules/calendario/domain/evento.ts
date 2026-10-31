/**
 * Entidad del dominio Calendario.
 *
 * Un evento representa una entrada en el calendario institucional. Se divide
 * en tres naturalezas:
 *  - OFICIAL: creado por ADMIN o COMUNICADOR (este último solo para su
 *    propio decanato). Se difunde a una audiencia. Notifica al resto de
 *    usuarios afectados vía fan-out. El usuario puede agregarlo a su agenda
 *    vía la pivot `evento_participantes`.
 *  - PERSONAL: creado por cualquier usuario autenticado. Solo visible para
 *    su dueño.
 *  - INSTITUCIONAL: fechas fijas del calendario académico (solo ADMIN las
 *    crea). Visible para todos automáticamente; no se agrega ni se quita de
 *    la agenda: siempre está presente.
 *  - FERIADO: día no laborable del calendario institucional (puentes,
 *    recesos, efemérides). Mismo régimen que INSTITUCIONAL (solo ADMIN,
 *    visible a todos, sin participantes) — la diferencia es solo presentacional:
 *    la agenda y las tarjetas lo piden con su color propio.
 *
 * El campo `usuario_id` siempre está presente: es el "propietario/creador"
 * del evento, lo que permite que un ADMIN edite/elimine los oficiales que
 * él mismo creó (y los INSTITUCIONAL/FERIADO) sin necesidad de un campo
 * `creado_por` separado.
 */
export const TIPOS_EVENTO = ['OFICIAL', 'PERSONAL', 'INSTITUCIONAL', 'FERIADO'] as const;
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
  /** Ubicación opcional (aula, sala, edificio). */
  lugar: string | null;
  createdAt: Date;
  /** Solo aplica a eventos OFICIALES; `[]` = GLOBAL. */
  decanatoIds: number[];
  /**
   * True si el usuario autenticado agregó el evento a su agenda
   * (fila en `evento_participantes`). Los casos de uso lo decoran con las
   * participaciones del claim actual; en contextos sin usuario (job del
   * sistema) queda en false.
   */
  participo: boolean;
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
  lugar?: string | null;
  /** Audiencia: aplica solo a OFICIAL; `[]` = GLOBAL. */
  decanatoIds?: number[];
}

/** No se permite cambiar el tipo de un evento (semánticamente incompatible). */
export type EditarEventoInput = Partial<Omit<CrearEventoInput, 'tipo'>>;
