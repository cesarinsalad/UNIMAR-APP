import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors';
import type { IComunicadoRepository } from '../domain/ports';
import type { Comunicado } from '../domain/comunicado';

/**
 * Caso de uso: retirar un comunicado PUBLICADO del feed de los estudiantes.
 *
 * El comunicado pasa a ARCHIVADO; no se borra físicamente (trazabilidad).
 */
export class ArchivarComunicado {
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

      if (existente.estado !== 'PUBLICADO') {
        throw new BadRequestError('Solo se puede archivar un comunicado publicado');
      }

      if (claims.role === 'COMUNICADOR' && existente.autorId !== claims.sub) {
        throw new ForbiddenError('No puedes archivar un comunicado que no creaste');
      }

      const actualizado = await this.repo.transicionarEstado(tx, id, {
        estado: 'ARCHIVADO',
      });

      if (!actualizado) {
        throw new NotFoundError('Comunicado no encontrado tras archivar');
      }
      return actualizado;
    });
  }
}
