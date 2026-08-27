import type { DbTx } from '../../../shared/kernel/db';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { TrabajoPostCommit, EventoComunicadoPublicado } from '../../../shared/kernel/eventos';
import type { INotificacionRepository, IDispositivoRepository, IPushService } from '../domain/ports';

/**
 * Handler del evento `COMUNICADO_PUBLICADO`.
 *
 * Fase DENTRO del tx (con claims del publicador):
 *  1. Resolver destinatarios por audiencia (excluyendo al autor).
 *  2. Insertar UNA fila de notificación en `notificaciones` por destinatario.
 *     La política de INSERT es `WITH CHECK(true)` precisamente para que el
 *     fan-out pueda crear filas para otros usuarios.
 *
 * Fase POST-COMMIT (job diferido):
 *  1. Resolver tokens de destinatarios en modo sistema (`uow.run`, sin claims)
 *     porque la política `dispositivos_select_sistema` solo aplica ahí.
 *  2. Enviar push best-effort. Errores del proveedor no se propagan al
 *     cliente que originó la publicación: el comunicado ya está en BD.
 */
export class FanOutComunicadoPublicado {
  constructor(
    private readonly notificacionRepo: INotificacionRepository,
    private readonly dispositivoRepo: IDispositivoRepository,
    private readonly push: IPushService,
    private readonly uow: UnitOfWork,
  ) {}

  async manejar(evento: EventoComunicadoPublicado): Promise<TrabajoPostCommit | null> {
    const destinatarios = await this.resolveDestinatarios(
      evento.tx,
      evento.autorId,
      evento.decanatoIds,
    );

    if (destinatarios.length === 0) return null;

    const titulo = 'Nuevo comunicado publicado';
    const cuerpo = evento.titulo;

    await this.notificacionRepo.crearMasivo(evento.tx, {
      usuarioIds: destinatarios,
      tipo: 'COMUNICADO_PUBLICADO',
      titulo,
      cuerpo,
      referenciaId: evento.comunicadoId,
    });

    const data = { tipo: 'COMUNICADO_PUBLICADO', referencia_id: evento.comunicadoId };

    return async () => {
      const tokens = await this.uow.run((tx) =>
        this.dispositivoRepo.tokensDeUsuarios(tx, destinatarios),
      );
      if (tokens.length === 0) return;
      await this.push.enviar(
        tokens.map((to) => ({ to, title: titulo, body: cuerpo, data })),
      );
    };
  }

  /**
   * GLOBAL (decanatoIds vacío) → todos los usuarios excepto el autor.
   * Audiencia específica → usuarios cuyo `decanato_id` está en la lista,
   * excepto el autor.
   */
  private async resolveDestinatarios(
    tx: DbTx,
    autorId: string,
    decanatoIds: number[],
  ): Promise<string[]> {
    const esGlobal = decanatoIds.length === 0;
    if (esGlobal) {
      const r = await tx.query<{ id: string }>(
        'SELECT id FROM usuarios WHERE id <> $1',
        [autorId],
      );
      return r.rows.map((row) => row.id);
    }
    const r = await tx.query<{ id: string }>(
      'SELECT id FROM usuarios WHERE id <> $1 AND decanato_id = ANY($2::int[])',
      [autorId, decanatoIds],
    );
    return r.rows.map((row) => row.id);
  }
}
