import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { Decanato } from '../domain/decanato';
import type { IDecanatoRepository } from '../domain/ports';

/**
 * Caso de uso: listar el catálogo de decanatos para los selectores de
 * audiencia del cliente (comunicados del Paso 3, eventos del Paso 4).
 *
 * Bajo claims del usuario autenticado (uow.runAs); la política RLS de la
 * tabla (`decanatos_app_bff USING(true)` tabla de sistema) permite la
 * lectura sin relajaciones.
 */
export class ListarDecanatos {
  constructor(
    private readonly repo: IDecanatoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims): Promise<Decanato[]> {
    return this.uow.runAs(claims, async (tx) => this.repo.listar(tx));
  }
}