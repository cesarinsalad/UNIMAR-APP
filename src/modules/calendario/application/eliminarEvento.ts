import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { ForbiddenError, NotFoundError } from '../../../shared/errors';
import type { IEventoRepository } from '../domain/ports';
import type { Evento } from '../domain/evento';

/**
 * Caso de uso: eliminar un evento.
 *
 * Reglas:
 *  - PERSONAL: solo el dueño.
 *  - OFICIAL: ADMIN, o el COMUNICADOR que lo creó.
 *
 * El borrado es físico. RLS actúa como segunda barrera y rechaza operaciones
 * no permitidas con 0 filas, pero aquí devolvemos errores legibles en
 * español antes de tocar la base.
 */
export class EliminarEvento {
  constructor(
    private readonly repo: IEventoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims, id: string): Promise<void> {
    await this.uow.runAs(claims, async (tx) => {
      const existente = await this.repo.buscarPorId(tx, id);
      if (!existente) throw new NotFoundError('Evento no encontrado');

      this.validarPermisos(claims, existente);

      const ok = await this.repo.eliminar(tx, id);
      if (!ok) throw new NotFoundError('Evento no encontrado tras eliminar');
    });
  }

  private validarPermisos(claims: Claims, existente: Evento): void {
    if (existente.tipo === 'PERSONAL') {
      if (existente.usuarioId !== claims.sub) {
        throw new ForbiddenError('No puedes eliminar un evento personal ajeno');
      }
      return;
    }
    // OFICIAL
    if (claims.role === 'ADMIN') return;
    if (claims.role === 'COMUNICADOR' && existente.usuarioId === claims.sub) return;
    throw new ForbiddenError('No tienes permisos para eliminar este evento oficial');
  }
}
