import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { INotificacionRepository } from '../domain/ports';

/**
 * Caso de uso: marcar TODAS las notificaciones del usuario como leídas.
 *
 * Útil para el botón "Marcar todo como leído" de la bandeja. RLS limita el
 * UPDATE a filas propias, así que la cantidad devuelta es la que el usuario
 * efectivamente tenía pendientes (independiente de notificaciones ajenas).
 */
export class MarcarTodasLeidas {
  constructor(
    private readonly repo: INotificacionRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims): Promise<{ actualizadas: number }> {
    const actualizadas = await this.uow.runAs(claims, async (tx) =>
      this.repo.marcarTodasLeidas(tx),
    );
    return { actualizadas };
  }
}
