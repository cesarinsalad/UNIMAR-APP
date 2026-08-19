import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors';
import type { IComunicadoRepository } from '../domain/ports';
import type { Comunicado } from '../domain/comunicado';

/**
 * Caso de uso: publicación directa por parte del ADMIN.
 *
 * Salta el paso de revisión porque el ADMIN no tiene un aprobador superior.
 * Es útil para comunicados globales o urgentes de la oficina central.
 */
export class PublicarComunicado {
  constructor(
    private readonly repo: IComunicadoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(
    claims: Claims,
    id: string,
    input: { programadoPara?: string | null; expiraAt?: string | null },
  ): Promise<Comunicado> {
    if (claims.role !== 'ADMIN') {
      throw new ForbiddenError('Solo el administrador puede publicar directamente');
    }

    return this.uow.runAs(claims, async (tx) => {
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
      return actualizado;
    });
  }
}
