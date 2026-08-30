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
      tipo: 'OFICIAL' | 'PERSONAL';
      usuarioId: string;
      inicioAt: string;
      finAt: string | null;
      diaCompleto: boolean;
      recordatorioMinutos: number | null;
    },
  ): Promise<Evento>;

  agregarAudiencias(tx: DbTx, eventoId: string, decanatoIds: number[]): Promise<void>;

  buscarPorId(tx: DbTx, id: string): Promise<Evento | null>;

  listar(
    tx: DbTx,
    filtro: { desde: Date; hasta: Date; limit: number; offset: number },
  ): Promise<Evento[]>;

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
   * recordatorio. PERSONALES: solo el dueño. OFICIALES: audiencia GLOBAL =
   * todos los usuarios; audiencia específica = usuarios de esos decanatos.
   * El creador del evento se excluye en ambos casos para no duplicar con el
   * fan-out inicial.
   */
  destinatariosDeEvento(tx: DbTx, evento: Evento): Promise<string[]>;

  /** Devuelve los usuarioIds que aún no tienen un recordatorio enviado. */
  filtrarYaEnviados(tx: DbTx, eventoId: string, usuarioIds: string[]): Promise<string[]>;

  /** Marca los destinatarios como notificados (idempotente). */
  marcarRecordatoriosEnviados(tx: DbTx, eventoId: string, usuarioIds: string[]): Promise<void>;
}
