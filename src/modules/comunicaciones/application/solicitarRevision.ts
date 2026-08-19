import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors';
import type { IComunicadoRepository } from '../domain/ports';
import type { Comunicado } from '../domain/comunicado';

/**
 * Caso de uso: enviar un comunicado BORRADOR a revisión del ADMIN.
 *
 * El comunicado queda congelado (PENDIENTE) mientras espera aprobación o
 * rechazo; se limpia cualquier motivo de rechazo anterior.
 */
export class SolicitarRevision {
  constructor(
    private readonly repo: IComunicadoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims, id: string): Promise<Comunicado> {
    return this.uow.runAs(claims, async (tx) => {
      const existente = await this.repo.buscarPorId(tx, id);
      if (!existente) {
        throw new NotFoundError('Comunicado no encontrado');
      }

      if (existente.autorId !== claims.sub) {
        throw new ForbiddenError('Solo el autor puede solicitar revisión');
      }

      if (existente.estado !== 'BORRADOR') {
        throw new BadRequestError('Solo se puede solicitar revisión desde BORRADOR');
      }

      const actualizado = await this.repo.transicionarEstado(tx, id, {
        estado: 'PENDIENTE',
        motivoRechazo: null,
      });

      if (!actualizado) {
        throw new NotFoundError('Comunicado no encontrado tras transicionar');
      }
      return actualizado;
    });
  }
}
