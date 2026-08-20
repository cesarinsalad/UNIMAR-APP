import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { Dispositivo } from '../domain/dispositivo';
import type { IDispositivoRepository } from '../domain/ports';

/**
 * Caso de uso: listar los dispositivos del usuario autenticado.
 *
 * RLS restringe el SELECT a filas del propio usuario, por lo que el repositorio
 * no necesita ningún filtro adicional: la consulta ya viene limitada por la
 * política. Devuelve los dispositivos más recientes primero.
 */
export class ListarDispositivos {
  constructor(
    private readonly repo: IDispositivoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims): Promise<Dispositivo[]> {
    return this.uow.runAs(claims, async (tx) =>
      this.repo.listarPorUsuario(tx, claims.sub),
    );
  }
}
