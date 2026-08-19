import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors';
import type { IComunicadoRepository } from '../domain/ports';
import type { Comunicado, EditarComunicadoInput, Estado } from '../domain/comunicado';

const EDITABLES: Estado[] = ['BORRADOR', 'PUBLICADO'];

/**
 * Caso de uso: editar un comunicado existente.
 *
 * Reglas:
 * - PENDIENTE está congelado en revisión; no se puede editar (hay que rechazar).
 * - ARCHIVADO es histórico; no se puede editar.
 * - COMUNICADOR solo edita lo suyo y re-valida la regla de audiencia.
 */
export class EditarComunicado {
  constructor(
    private readonly repo: IComunicadoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims, id: string, input: EditarComunicadoInput): Promise<Comunicado> {
    return this.uow.runAs(claims, async (tx) => {
      const existente = await this.repo.buscarPorId(tx, id);
      if (!existente) {
        throw new NotFoundError('Comunicado no encontrado');
      }

      if (!EDITABLES.includes(existente.estado)) {
        throw new BadRequestError(
          `No se puede editar un comunicado en estado ${existente.estado}`,
        );
      }

      if (claims.role === 'COMUNICADOR' && existente.autorId !== claims.sub) {
        throw new ForbiddenError('No puedes editar un comunicado que no creaste');
      }

      if (input.decanatoIds !== undefined && claims.role === 'COMUNICADOR') {
        if (
          input.decanatoIds.length !== 1 ||
          input.decanatoIds[0] !== claims.decanato_id
        ) {
          throw new BadRequestError(
            'El comunicador solo puede dirigirse a su propio decanato',
          );
        }
      }

      const actualizado = await this.repo.actualizar(tx, id, {
        titulo: input.titulo,
        cuerpo: input.cuerpo,
        programadoPara: input.programadoPara,
        expiraAt: input.expiraAt,
        decanatoIds: input.decanatoIds,
      });

      if (!actualizado) {
        throw new NotFoundError('Comunicado no encontrado tras actualizar');
      }
      return actualizado;
    });
  }
}
