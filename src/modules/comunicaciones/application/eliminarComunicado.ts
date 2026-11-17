import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { ForbiddenError, NotFoundError } from '../../../shared/errors';
import type { IComunicadoRepository } from '../domain/ports';

/**
 * Caso de uso: eliminar (borrado lógico) un comunicado.
 *
 * Reglas:
 *  - ADMIN puede eliminar cualquiera.
 *  - COMUNICADOR solo los que creó.
 *  - Desde cualquier estado (BORRADOR/PENDIENTE/PUBLICADO/ARCHIVADO): un
 *    borrador de pruebas no tenía ninguna salida (archivar exige PUBLICADO).
 *
 * No se borra la fila: `deleted_at` la oculta para todos (RLS) y los
 * adjuntos/portada quedan intactos. RLS es la segunda barrera: si no deja
 * actualizar, `marcarEliminado` devuelve false y aquí se traduce a 404.
 */
export class EliminarComunicado {
  constructor(
    private readonly repo: IComunicadoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims, id: string): Promise<void> {
    if (claims.role !== 'COMUNICADOR' && claims.role !== 'ADMIN') {
      throw new ForbiddenError('Solo comunicadores o administradores pueden eliminar comunicados');
    }

    await this.uow.runAs(claims, async (tx) => {
      const existente = await this.repo.buscarPorId(tx, id);
      if (!existente) {
        throw new NotFoundError('Comunicado no encontrado');
      }

      if (claims.role === 'COMUNICADOR' && existente.autorId !== claims.sub) {
        throw new ForbiddenError('No puedes eliminar un comunicado que no creaste');
      }

      const eliminado = await this.repo.marcarEliminado(tx, id, claims.sub);
      if (!eliminado) {
        throw new NotFoundError('Comunicado no encontrado tras eliminar');
      }
    });
  }
}
