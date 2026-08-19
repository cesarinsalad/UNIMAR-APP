import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { ForbiddenError, NotFoundError } from '../../../shared/errors';
import type { IComunicadoRepository } from '../domain/ports';

/**
 * Caso de uso: contar cuántos usuarios han leído un comunicado.
 *
 * Disponible solo para el autor del comunicado o el ADMIN. Un estudiante que
 * pueda leer el comunicado no puede ver sus estadísticas (información propia
 * del comunicador).
 */
export class EstadisticasComunicado {
  constructor(
    private readonly repo: IComunicadoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims, id: string): Promise<{ lecturas: number }> {
    return this.uow.runAs(claims, async (tx) => {
      const existente = await this.repo.buscarPorId(tx, id);
      if (!existente) {
        throw new NotFoundError('Comunicado no encontrado');
      }

      if (claims.role !== 'ADMIN' && existente.autorId !== claims.sub) {
        throw new ForbiddenError('No puedes ver estadísticas de este comunicado');
      }

      const lecturas = await this.repo.contarLecturas(tx, id);
      return { lecturas };
    });
  }
}
