import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type {
  EventoComunicadoRechazado,
  TrabajoPostCommit,
} from '../../../shared/kernel/eventos';
import type {
  INotificacionRepository,
  IDispositivoRepository,
  IPushService,
} from '../domain/ports';

/**
 * Handler del evento `COMUNICADO_RECHAZADO`.
 *
 * Solo se inserta UNA notificación: la dirigida al autor del comunicado, con
 * el motivo del rechazo como cuerpo. Se diferencia del fan-out de publicación
 * porque no hay audiencia: el rechazo siempre es 1:1.
 *
 * Misma mecánica en dos fases:
 *  - Dentro del tx del rechazo (con claims del ADMIN): insert.
 *  - Post-COMMIT: push best-effort a los dispositivos del autor.
 */
export class FanOutComunicadoRechazado {
  constructor(
    private readonly notificacionRepo: INotificacionRepository,
    private readonly dispositivoRepo: IDispositivoRepository,
    private readonly push: IPushService,
    private readonly uow: UnitOfWork,
  ) {}

  async manejar(evento: EventoComunicadoRechazado): Promise<TrabajoPostCommit | null> {
    const titulo = 'Comunicado rechazado';
    const cuerpo = evento.motivo;

    await this.notificacionRepo.crearMasivo(evento.tx, {
      usuarioIds: [evento.autorId],
      tipo: 'COMUNICADO_RECHAZADO',
      titulo,
      cuerpo,
      referenciaId: evento.comunicadoId,
    });

    const data = { tipo: 'COMUNICADO_RECHAZADO', referencia_id: evento.comunicadoId };

    return async () => {
      const tokens = await this.uow.run((tx) =>
        this.dispositivoRepo.tokensDeUsuarios(tx, [evento.autorId]),
      );
      if (tokens.length === 0) return;
      await this.push.enviar(
        tokens.map((to) => ({ to, title: titulo, body: cuerpo, data })),
      );
    };
  }
}
