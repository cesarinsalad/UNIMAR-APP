import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { NotFoundError } from '../../../shared/errors';
import type { IEventoRepository } from '../domain/ports';

/**
 * Caso de uso: quitar un evento de la agenda del usuario.
 *
 * Igual que `ParticiparEvento`, la visibilidad la decide RLS (404 si no es
 * visible). Idempotente: abandonar un evento que no está agregado no es
 * error (DELETE de 0 filas).
 */
export class AbandonarEvento {
  constructor(
    private readonly repo: IEventoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims, id: string): Promise<void> {
    await this.uow.runAs(claims, async (tx) => {
      const evento = await this.repo.buscarPorId(tx, id);
      if (!evento) throw new NotFoundError('Evento no encontrado');
      await this.repo.abandonar(tx, evento.id, claims.sub);
    });
  }
}
