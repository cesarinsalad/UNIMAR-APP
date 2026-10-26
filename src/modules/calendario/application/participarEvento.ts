import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { BadRequestError, NotFoundError } from '../../../shared/errors';
import type { IEventoRepository } from '../domain/ports';

/**
 * Caso de uso: agregar un evento OFICIAL a la agenda del usuario
 * (pivot `evento_participantes`).
 *
 * Reglas:
 *  - La visibilidad la decide RLS: si el evento no es visible para el
 *    usuario autenticado, el `buscarPorId` devuelve `null` → 404.
 *  - Solo los OFICIALES participan: los PERSONAL ya están en la agenda de
 *    su dueño y los INSTITUCIONAL se muestran a todos automáticamente.
 *  - Idempotente: re-agregar un evento ya presente no es error.
 */
export class ParticiparEvento {
  constructor(
    private readonly repo: IEventoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims, id: string): Promise<void> {
    await this.uow.runAs(claims, async (tx) => {
      const evento = await this.repo.buscarPorId(tx, id);
      if (!evento) throw new NotFoundError('Evento no encontrado');
      if (evento.tipo !== 'OFICIAL') {
        throw new BadRequestError(
          'Solo los eventos oficiales se pueden agregar a la agenda',
        );
      }
      await this.repo.participar(tx, evento.id, claims.sub);
    });
  }
}
