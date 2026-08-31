import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { ICedulaResolver } from '../../../shared/kernel/cedulaResolver';
import type { IUniversityAcademicService } from '../domain/ports';
import type { PensumDTO } from '../domain/dtos';
import { resolverCedula } from './obtenerPerfil';

/**
 * Caso de uso: obtener el plan de estudios (pénsum) del estudiante.
 *
 * `carreraId` se puede derivar del perfil del usuario o venir en el body;
 * en esta versión se pide explícita en el query (la universidad puede
 * manejar varias carreras y un mismo estudiante podría no tener un único
 * pénsum cargado en su perfil).
 */
export class ObtenerPensum {
  constructor(
    private readonly academic: IUniversityAcademicService,
    private readonly cedulaResolver: ICedulaResolver,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims, carreraId: string): Promise<PensumDTO> {
    return this.uow.run(async (tx) => {
      const cedula = await resolverCedula(tx, claims, this.cedulaResolver);
      return this.academic.pensum(cedula, carreraId);
    });
  }
}
