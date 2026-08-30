import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { DbTx } from '../../../shared/kernel/db';
import type { IEventoRepository } from '../domain/ports';
import type {
  INotificadorInApp,
  IProveedorTokens,
  IPushService,
} from '../../../shared/kernel/notificacion';

/**
 * Job en background que envía recordatorios de eventos próximos.
 *
 * Fase DENTRO del tx (modo sistema, sin claims — `uow.run`):
 *  1. Buscar eventos cuyo momento de recordatorio haya caído en la ventana
 *     `[now() - ventanaSegundos, now()]`.
 *  2. Resolver destinatarios por audiencia (OFICIAL) o por dueño (PERSONAL).
 *  3. Filtrar los que ya recibieron el recordatorio (idempotencia vía
 *     `evento_recordatorios_enviados`).
 *  4. Insertar UNA notificación in-app por destinatario.
 *  5. Marcar como enviados.
 *
 * Fase POST-COMMIT (best-effort): enviar push a los dispositivos
 * registrados. Errores del proveedor no se propagan (el `IPushService` ya
 * implementa swallow + log).
 *
 * Deuda técnica: usar `setInterval` simple sin lock. En producción esto se
 * sustituiría por un scheduler externo (pg_cron, BullMQ, etc.) que
 * soporte múltiples instancias del BFF sin duplicar envíos.
 */
export interface RecordatoriosJobOptions {
  /** Cada cuánto se ejecuta. Por defecto: 60s. */
  intervalMs?: number;
  /** Ventana hacia atrás para considerar "vencido". Por defecto: 60s. */
  ventanaSegundos?: number;
  logger?: { error: (...args: unknown[]) => void };
}

export class RecordatoriosJob {
  private timer: NodeJS.Timeout | null = null;
  private readonly logger: { error: (...args: unknown[]) => void };

  constructor(
    private readonly eventoRepo: IEventoRepository,
    private readonly notifRepo: INotificadorInApp,
    private readonly dispRepo: IProveedorTokens,
    private readonly push: IPushService,
    private readonly uow: UnitOfWork,
    private readonly options: RecordatoriosJobOptions = {},
  ) {
    this.logger = options.logger ?? console;
  }

  iniciar(): void {
    const interval = this.options.intervalMs ?? 60_000;
    this.timer = setInterval(() => {
      this.ejecutarUnaVez().catch((err) =>
        this.logger.error('[calendario:recordatorios] tick falló:', err),
      );
    }, interval);
    // No bloquear el shutdown del proceso por este timer.
    this.timer.unref?.();
  }

  detener(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async ejecutarUnaVez(): Promise<void> {
    const ventanaSegundos = this.options.ventanaSegundos ?? 60;
    await this.uow.run(async (tx) => {
      const candidatos = await this.eventoRepo.eventosConRecordatorioPendiente(
        tx,
        ventanaSegundos,
      );
      for (const evento of candidatos) {
        await this.procesarEvento(tx, evento);
      }
    });
  }

  private async procesarEvento(
    tx: DbTx,
    evento: Awaited<ReturnType<IEventoRepository['eventosConRecordatorioPendiente']>>[number],
  ): Promise<void> {
    const destinatarios = await this.eventoRepo.destinatariosDeEvento(tx, evento);
    const nuevos = await this.eventoRepo.filtrarYaEnviados(tx, evento.id, destinatarios);
    if (nuevos.length === 0) return;

    const minutos = evento.recordatorioMinutos ?? 0;
    const titulo = `Recordatorio: ${evento.titulo}`;
    const cuerpo =
      minutos === 0
        ? 'El evento comienza ahora'
        : `El evento comienza en ${minutos} minutos`;

    await this.notifRepo.crearMasivo(tx, {
      usuarioIds: nuevos,
      tipo: 'EVENTO_RECORDATORIO',
      titulo,
      cuerpo,
      referenciaId: evento.id,
    });

    const data = { tipo: 'EVENTO_RECORDATORIO', referencia_id: evento.id };
    const tokens = await this.dispRepo.tokensDeUsuarios(tx, nuevos);
    if (tokens.length > 0) {
      await this.push.enviar(
        tokens.map((to) => ({ to, title: titulo, body: cuerpo, data })),
      );
    }

    await this.eventoRepo.marcarRecordatoriosEnviados(tx, evento.id, nuevos);
  }
}
