import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { NotFoundError } from '../../../shared/errors';
import { exigirEstadisticas } from '../../../shared/security/estadisticas';
import type { IEventoRepository } from '../domain/ports';

/**
 * Caso de uso: contar cuántos usuarios tienen el evento en su agenda
 * (`evento_participantes`, opt-in). Es la stats del staff para medir el
 * alcance real de un evento: cuántas personas lo agregaron.
 *
 * Alcance (coherente con los comunicados): ADMIN, el creador del evento y
 * el COMUNICADOR cuyo decanato está en la audiencia (gestiona lo de su
 * decanato). Un estudiante que pueda ver el evento no puede ver sus
 * estadísticas: son información del staff.
 */
export class EstadisticasEvento {
  constructor(
    private readonly repo: IEventoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims, id: string): Promise<{ participantes: number }> {
    return this.uow.runAs(claims, async (tx) => {
      const existente = await this.repo.buscarPorId(tx, id);
      if (!existente) {
        throw new NotFoundError('Evento no encontrado');
      }

      exigirEstadisticas({
        claims,
        dueño: existente.usuarioId,
        audienciaIds: existente.decanatoIds,
      });

      const participantes = await this.repo.contarParticipantes(tx, id);
      return { participantes };
    });
  }
}
