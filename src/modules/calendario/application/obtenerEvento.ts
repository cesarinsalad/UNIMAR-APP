import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { NotFoundError } from '../../../shared/errors';
import type { IEventoRepository } from '../domain/ports';
import type { Evento } from '../domain/evento';

/**
 * Caso de uso: obtener el detalle de un evento.
 *
 * La visibilidad la decide RLS: si el evento no es visible para el usuario
 * autenticado (no es ADMIN, no es PERSONAL propio, no es OFICIAL en su
 * audiencia), el `buscarPorId` devuelve `null` y aquí se traduce a 404
 * (no se filtra la existencia de eventos ajenos).
 */
export class ObtenerEvento {
  constructor(
    private readonly repo: IEventoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims, id: string): Promise<Evento> {
    return this.uow.runAs(claims, async (tx) => {
      const evento = await this.repo.buscarPorId(tx, id);
      if (!evento) throw new NotFoundError('Evento no encontrado');
      return evento;
    });
  }
}
