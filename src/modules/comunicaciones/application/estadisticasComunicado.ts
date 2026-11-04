import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { NotFoundError } from '../../../shared/errors';
import { exigirEstadisticas } from '../../../shared/security/estadisticas';
import type { IComunicadoRepository } from '../domain/ports';

/**
 * Caso de uso: contar cuántos usuarios han leído un comunicado.
 *
 * Alcance (shared kernel `exigirEstadisticas`): ADMIN, el autor, y el
 * COMUNICADOR cuyo decanato está en la audiencia del comunicado — el
 * comunicador gestiona y mide lo de su decanato (audiencia global entre
 * comunicadores). Un estudiante que pueda leer el comunicado no puede ver
 * sus estadísticas: son información del staff.
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

      exigirEstadisticas({
        claims,
        dueño: existente.autorId,
        audienciaIds: existente.decanatoIds,
      });

      const lecturas = await this.repo.contarLecturas(tx, id);
      return { lecturas };
    });
  }
}
