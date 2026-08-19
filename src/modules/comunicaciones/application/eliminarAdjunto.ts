import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { ForbiddenError, NotFoundError } from '../../../shared/errors';
import type { IComunicadoRepository, IAdjuntoRepository, IStorageService } from '../domain/ports';

/**
 * Caso de uso: eliminar un adjunto (metadatos + objeto de Storage).
 *
 * Orden de eliminación: primero la fila en la transacción de Postgres; luego
 * el objeto en Storage. Si la eliminación en Storage falla, Postgres hace
 * ROLLBACK y el metadato permanece (permitiendo reintentar). El borrado de la
 * fila también está protegido por RLS mediante la política adjuntos_delete.
 */
export class EliminarAdjunto {
  constructor(
    private readonly comunicadoRepo: IComunicadoRepository,
    private readonly adjuntoRepo: IAdjuntoRepository,
    private readonly storage: IStorageService,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims, adjuntoId: string): Promise<void> {
    return this.uow.runAs(claims, async (tx) => {
      const adjunto = await this.adjuntoRepo.buscarPorId(tx, adjuntoId);
      if (!adjunto) {
        throw new NotFoundError('Adjunto no encontrado');
      }

      const comunicado = await this.comunicadoRepo.buscarPorId(tx, adjunto.comunicadoId);
      if (!comunicado) {
        throw new NotFoundError('Comunicado asociado no encontrado');
      }

      if (claims.role !== 'ADMIN' && comunicado.autorId !== claims.sub) {
        throw new ForbiddenError('No puedes eliminar adjuntos de este comunicado');
      }

      const eliminado = await this.adjuntoRepo.eliminar(tx, adjuntoId);
      if (!eliminado) {
        throw new NotFoundError('Adjunto no encontrado al eliminar');
      }

      // Storage es un sistema externo; lo borramos después de la fila para que
      // un fallo aquí no deje un metadato huérfano.
      await this.storage.eliminarObjeto(adjunto.storagePath);
    });
  }
}
