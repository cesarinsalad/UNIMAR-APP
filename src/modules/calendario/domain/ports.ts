import type { DbTx } from '../../../shared/kernel/db';
import type { Evento } from './evento';

/**
 * Puerto de repositorio del componente Calendario.
 *
 * Cada método recibe explícitamente la transacción (`DbTx`) porque toda
 * operación debe ejecutarse dentro del UnitOfWork del BFF, donde RLS evalúa
 * los claims del usuario autenticado.
 *
 * Los métodos `eventosConRecordatorioPendiente`, `destinatariosDeEvento`,
 * `filtrarYaEnviados` y `marcarRecordatoriosEnviados` los consume el job de
 * recordatorios, que corre en modo sistema (`uow.run`, sin claims).
 */
export interface IEventoRepository {
  crear(
    tx: DbTx,
    input: {
      titulo: string;
      descripcion: string | null;
      tipo: 'OFICIAL' | 'PERSONAL' | 'INSTITUCIONAL';
      usuarioId: string;
      inicioAt: string;
      finAt: string | null;
      diaCompleto: boolean;
      recordatorioMinutos: number | null;
      lugar: string | null;
    },
  ): Promise<Evento>;

  agregarAudiencias(tx: DbTx, eventoId: string, decanatoIds: number[]): Promise<void>;

  buscarPorId(tx: DbTx, id: string): Promise<Evento | null>;

  listar(
    tx: DbTx,
    filtro: {
      desde: Date;
      hasta: Date;
      limit: number;
      offset: number;
      /** Participaciones del claim (para decorar `participo`). */
      usuarioId: string;
      /** 'agregados': excluye los OFICIALES que el usuario no agregó. */
      incluirOficiales: 'todos' | 'agregados';
    },
  ): Promise<Evento[]>;

  /**
   * Agrega el evento a la agenda del usuario (`evento_participantes`).
   * Idempotente: re-agregar no es error (ON CONFLICT DO NOTHING).
   */
  participar(tx: DbTx, eventoId: string, usuarioId: string): Promise<void>;

  /** Quita el evento de la agenda del usuario. Idempotente (efímero). */
  abandonar(tx: DbTx, eventoId: string, usuarioId: string): Promise<void>;

  /**
   * Devuelve los ids de `eventoIds` en los que el usuario participa.
   * Para decorar listas (`participo`) en una sola consulta.
   */
  participacionIds(tx: DbTx, usuarioId: string, eventoIds: string[]): Promise<string[]>;

  actualizar(
    tx: DbTx,
    id: string,
    input: {
      titulo?: string;
      descripcion?: string | null;
      inicioAt?: string;
      finAt?: string | null;
      diaCompleto?: boolean;
      recordatorioMinutos?: number | null;
      lugar?: string | null;
      decanatoIds?: number[];
    },
  ): Promise<Evento | null>;

  eliminar(tx: DbTx, id: string): Promise<boolean>;

  /**
   * Devuelve los eventos con `recordatorio_minutos` cuyo momento de disparo
   * (inicio_at - recordatorio_minutos) esté en la ventana
   * [now() - ventanaSegundos, now()]. Pensado para el job en modo sistema.
   */
  eventosConRecordatorioPendiente(tx: DbTx, ventanaSegundos: number): Promise<Evento[]>;

  /**
   * Resuelve los ids de usuario destinatarios de un evento a efectos de
   * recordatorio. PERSONALES: solo el dueño. OFICIALES: únicamente los
   * usuarios que lo agregaron a su agenda (`evento_participantes`) — desde
   * que la agenda es opt-in, el recordatorio la sigue. INSTITUCIONALES:
   * audiencia GLOBAL = todos los usuarios; audiencia específica = usuarios
   * de esos decanatos. En INSTITUCIONAL el creador se excluye para no
   * duplicar con el fan-out inicial.
   */
  destinatariosDeEvento(tx: DbTx, evento: Evento): Promise<string[]>;

  /** Devuelve los usuarioIds que aún no tienen un recordatorio enviado. */
  filtrarYaEnviados(tx: DbTx, eventoId: string, usuarioIds: string[]): Promise<string[]>;

  /** Marca los destinatarios como notificados (idempotente). */
  marcarRecordatoriosEnviados(tx: DbTx, eventoId: string, usuarioIds: string[]): Promise<void>;
}
