import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { INotificacionRepository } from '../domain/ports';

/**
 * Caso de uso: contar notificaciones no leídas del usuario autenticado.
 *
 * Pensado para alimentar el badge de la app móvil sin tener que paginar la
 * bandeja. La política RLS ya limita la cuenta a las filas propias.
 */
export class ContarNotificacionesNoLeidas {
  constructor(
    private readonly repo: INotificacionRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims): Promise<{ total: number }> {
    const total = await this.uow.runAs(claims, async (tx) =>
      this.repo.contarNoLeidas(tx),
    );
    return { total };
  }
}
