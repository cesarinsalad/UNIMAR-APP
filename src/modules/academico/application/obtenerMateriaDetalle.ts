import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { ICedulaResolver } from '../../../shared/kernel/cedulaResolver';
import type { IUniversityAcademicService } from '../domain/ports';
import type { MateriaDTO } from '../domain/dtos';
import { resolverCedula } from './obtenerPerfil';

/**
 * Caso de uso: detalle de una materia específica del usuario autenticado.
 *
 * La materia pertenece al estudiante (la API externa valida que la cédula
 * la incluya); no se permite consultar materias de otro usuario.
 */
export class ObtenerMateriaDetalle {
  constructor(
    private readonly academic: IUniversityAcademicService,
    private readonly cedulaResolver: ICedulaResolver,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims, materiaId: string): Promise<MateriaDTO> {
    return this.uow.run(async (tx) => {
      const cedula = await resolverCedula(tx, claims, this.cedulaResolver);
      return this.academic.materiaDetalle(cedula, materiaId);
    });
  }
}
