import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { NotFoundError } from '../../../shared/errors';
import type { IDispositivoRepository } from '../domain/ports';

/**
 * Caso de uso: eliminar un dispositivo del usuario autenticado.
 *
 * RLS elimina silenciosamente filas ajenas (devuelve `false`); eso se mapea
 * a 404 para no filtrar existencia. La barra de error es la misma que para
 * un dispositivo que simplemente no existe.
 */
export class EliminarDispositivo {
  constructor(
    private readonly repo: IDispositivoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims, id: string): Promise<void> {
    await this.uow.runAs(claims, async (tx) => {
      const eliminado = await this.repo.eliminar(tx, id);
      if (!eliminado) {
        throw new NotFoundError('Dispositivo no encontrado');
      }
    });
  }
}
