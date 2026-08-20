import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { NotFoundError } from '../../../shared/errors';
import type { Notificacion } from '../domain/notificacion';
import type { INotificacionRepository } from '../domain/ports';

/**
 * Caso de uso: marcar una notificación como leída.
 *
 * Si la notificación no existe o pertenece a otro usuario, RLS filtra la fila
 * en el UPDATE y el repositorio devuelve `null`. Se interpreta igual que
 * "no existe" (404) para no filtrar la existencia de notificaciones ajenas.
 */
export class MarcarNotificacionLeida {
  constructor(
    private readonly repo: INotificacionRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims, id: string): Promise<Notificacion> {
    return this.uow.runAs(claims, async (tx) => {
      const actualizada = await this.repo.marcarLeida(tx, id);
      if (!actualizada) {
        throw new NotFoundError('Notificación no encontrada');
      }
      return actualizada;
    });
  }
}
