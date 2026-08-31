import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type {
  EventoNotaPublicada,
  TrabajoPostCommit,
} from '../../../shared/kernel/eventos';
import type {
  INotificacionRepository,
  IDispositivoRepository,
  IPushService,
} from '../domain/ports';

/**
 * Handler del evento `NOTA_PUBLICADA` (Paso 5 — Académico).
 *
 * Es un fan-out 1:1 (no hay audiencia): la notificación va dirigida
 * exclusivamente al estudiante dueño de la materia, ya validado por el
 * caso de uso `PublicarNota` antes de emitir el evento.
 *
 * Misma mecánica en dos fases que los demás fan-outs:
 *  - Dentro del tx: insertar UNA notificación in-app dirigida al usuario.
 *  - Post-COMMIT: enviar push best-effort a sus dispositivos.
 */
export class FanOutNotaPublicada {
  constructor(
    private readonly notificacionRepo: INotificacionRepository,
    private readonly dispositivoRepo: IDispositivoRepository,
    private readonly push: IPushService,
    private readonly uow: UnitOfWork,
  ) {}

  async manejar(evento: EventoNotaPublicada): Promise<TrabajoPostCommit | null> {
    const titulo = `Nueva nota publicada: ${evento.materiaNombre}`;
    const cuerpo = `Tu nota en ${evento.materiaNombre} (${evento.periodo}) es ${evento.nota}`;

    await this.notificacionRepo.crearMasivo(evento.tx, {
      usuarioIds: [evento.usuarioId],
      tipo: 'NOTA_PUBLICADA',
      titulo,
      cuerpo,
      referenciaId: evento.materiaId,
    });

    const data = {
      tipo: 'NOTA_PUBLICADA',
      materia_id: evento.materiaId,
      nota: evento.nota,
      periodo: evento.periodo,
    };

    return async () => {
      const tokens = await this.uow.run((tx) =>
        this.dispositivoRepo.tokensDeUsuarios(tx, [evento.usuarioId]),
      );
      if (tokens.length === 0) return;
      await this.push.enviar(
        tokens.map((to) => ({ to, title: titulo, body: cuerpo, data })),
      );
    };
  }
}
