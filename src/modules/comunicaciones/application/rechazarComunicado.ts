import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { EventBus } from '../../../shared/kernel/eventos';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors';
import type { IComunicadoRepository } from '../domain/ports';
import type { Comunicado } from '../domain/comunicado';

/**
 * Caso de uso: rechazar un comunicado PENDIENTE.
 *
 * Solo ADMIN. Vuelve a BORRADOR y deja un motivo visible para el autor, para
 * que pueda corregirlo y volver a solicitar revisión.
 *
 * Si se inyecta un `EventBus`, emite `COMUNICADO_RECHAZADO` dentro del tx; el
 * fan-out inserta una notificación dirigida al autor con el motivo y el push
 * se ejecuta post-COMMIT (best-effort).
 */
export class RechazarComunicado {
  constructor(
    private readonly repo: IComunicadoRepository,
    private readonly uow: UnitOfWork,
    private readonly eventos?: EventBus,
  ) {}

  async ejecutar(claims: Claims, id: string, input: { motivo: string }): Promise<Comunicado> {
    if (claims.role !== 'ADMIN') {
      throw new ForbiddenError('Solo el administrador puede rechazar comunicados');
    }

    const { comunicado, jobs } = await this.uow.runAs(claims, async (tx) => {
      const existente = await this.repo.buscarPorId(tx, id);
      if (!existente) {
        throw new NotFoundError('Comunicado no encontrado');
      }

      if (existente.estado !== 'PENDIENTE') {
        throw new BadRequestError('Solo se puede rechazar un comunicado en revisión');
      }

      const actualizado = await this.repo.transicionarEstado(tx, id, {
        estado: 'BORRADOR',
        motivoRechazo: input.motivo,
      });

      if (!actualizado) {
        throw new NotFoundError('Comunicado no encontrado tras rechazar');
      }

      const jobs = this.eventos
        ? await this.eventos.publicar({
            tipo: 'COMUNICADO_RECHAZADO',
            tx,
            comunicadoId: actualizado.id,
            titulo: actualizado.titulo,
            autorId: actualizado.autorId,
            motivo: input.motivo,
          })
        : [];

      return { comunicado: actualizado, jobs };
    });

    for (const job of jobs) {
      try {
        await job();
      } catch (err) {
        console.error('[comunicaciones:rechazar] job post-commit falló:', err);
      }
    }

    return comunicado;
  }
}
