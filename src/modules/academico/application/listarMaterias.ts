import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { ICedulaResolver } from '../../../shared/kernel/cedulaResolver';
import type { IUniversityAcademicService } from '../domain/ports';
import type { MateriaDTO } from '../domain/dtos';
import { resolverCedula } from './obtenerPerfil';

/**
 * Caso de uso: listar las materias (actuales e históricas) del usuario
 * autenticado, opcionalmente filtradas por periodo académico.
 *
 * Devuelve la unión discriminada validada con Zod (cada materia lleva su
 * discriminador `es_actual`). La app móvil decide cómo renderizar cada
 * variante según el campo presente.
 */
export class ListarMaterias {
  constructor(
    private readonly academic: IUniversityAcademicService,
    private readonly cedulaResolver: ICedulaResolver,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims, filtro: { periodo?: string }): Promise<MateriaDTO[]> {
    return this.uow.run(async (tx) => {
      const cedula = await resolverCedula(tx, claims, this.cedulaResolver);
      return this.academic.materias(cedula, filtro.periodo);
    });
  }
}
