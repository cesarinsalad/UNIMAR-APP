import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { EventBus } from '../../../shared/kernel/eventos';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors';
import type { IComunicadoRepository } from '../domain/ports';
import type { Comunicado } from '../domain/comunicado';

/**
 * Caso de uso: publicación directa por parte del ADMIN.
 *
 * Salta el paso de revisión porque el ADMIN no tiene un aprobador superior.
 * Es útil para comunicados globales o urgentes de la oficina central.
 *
 * Si se inyecta un `EventBus`, emite `COMUNICADO_PUBLICADO` igual que
 * `AprobarComunicado`; el push se ejecuta post-COMMIT (best-effort).
 */
export class PublicarComunicado {
  constructor(
    private readonly repo: IComunicadoRepository,
    private readonly uow: UnitOfWork,
    private readonly eventos?: EventBus,
  ) {}

  async ejecutar(
    claims: Claims,
    id: string,
    input: { programadoPara?: string | null; expiraAt?: string | null },
  ): Promise<Comunicado> {
    if (claims.role !== 'ADMIN') {
      throw new ForbiddenError('Solo el administrador puede publicar directamente');
    }

    const { comunicado, jobs } = await this.uow.runAs(claims, async (tx) => {
      const existente = await this.repo.buscarPorId(tx, id);
      if (!existente) {
        throw new NotFoundError('Comunicado no encontrado');
      }

      if (existente.estado !== 'BORRADOR') {
        throw new BadRequestError('Solo se puede publicar directamente desde BORRADOR');
      }

      const actualizado = await this.repo.transicionarEstado(tx, id, {
        estado: 'PUBLICADO',
        aprobadoPor: claims.sub,
        publicadoAt: new Date(),
        motivoRechazo: null,
        programadoPara: input.programadoPara,
        expiraAt: input.expiraAt,
      });

      if (!actualizado) {
        throw new NotFoundError('Comunicado no encontrado tras publicar');
      }

      const jobs = this.eventos
        ? await this.eventos.publicar({
            tipo: 'COMUNICADO_PUBLICADO',
            tx,
            comunicadoId: actualizado.id,
            titulo: actualizado.titulo,
            autorId: actualizado.autorId,
            decanatoIds: actualizado.decanatoIds,
          })
        : [];

      return { comunicado: actualizado, jobs };
    });

    for (const job of jobs) {
      try {
        await job();
      } catch (err) {
        console.error('[comunicaciones:publicar] job post-commit falló:', err);
      }
    }

    return comunicado;
  }
}
