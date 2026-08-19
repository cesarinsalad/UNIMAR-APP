import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { IComunicadoRepository } from '../domain/ports';
import type { Comunicado, Estado } from '../domain/comunicado';

/**
 * Caso de uso: listar comunicados visibles para el usuario autenticado.
 *
 * La visibilidad real la decide RLS en la base de datos; este caso de uso solo
 * aplica filtros y paginación. Un ESTUDIANTE que filtre por estado=BORRADOR
 * simplemente recibirá una lista vacía, no un error.
 */
export class ListarComunicados {
  constructor(
    private readonly repo: IComunicadoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(
    claims: Claims,
    filtro: { estado?: Estado; limit: number; offset: number },
  ): Promise<Comunicado[]> {
    return this.uow.runAs(claims, async (tx) => {
      return this.repo.listar(tx, filtro);
    });
  }
}
