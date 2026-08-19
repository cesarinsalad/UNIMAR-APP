import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors';
import type { IComunicadoRepository } from '../domain/ports';
import type { Comunicado } from '../domain/comunicado';

/**
 * Caso de uso: rechazar un comunicado PENDIENTE.
 *
 * Solo ADMIN. Vuelve a BORRADOR y deja un motivo visible para el autor, para
 * que pueda corregirlo y volver a solicitar revisión.
 */
export class RechazarComunicado {
  constructor(
    private readonly repo: IComunicadoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims, id: string, input: { motivo: string }): Promise<Comunicado> {
    if (claims.role !== 'ADMIN') {
      throw new ForbiddenError('Solo el administrador puede rechazar comunicados');
    }

    return this.uow.runAs(claims, async (tx) => {
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
      return actualizado;
    });
  }
}
