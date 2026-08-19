import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { NotFoundError } from '../../../shared/errors';
import type { IComunicadoRepository } from '../domain/ports';
import type { Comunicado } from '../domain/comunicado';

/**
 * Caso de uso: obtener el detalle de un comunicado.
 *
 * Si el usuario que lo consulta NO es el autor, se registra una lectura en
 * `comunicado_lecturas`. Esto alimenta las estadísticas de efectividad.
 */
export class ObtenerComunicado {
  constructor(
    private readonly repo: IComunicadoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims, id: string): Promise<Comunicado> {
    return this.uow.runAs(claims, async (tx) => {
      const comunicado = await this.repo.buscarPorId(tx, id);
      if (!comunicado) {
        throw new NotFoundError('Comunicado no encontrado');
      }

      if (comunicado.autorId !== claims.sub) {
        await this.repo.registrarLectura(tx, id, claims.sub);
      }

      return comunicado;
    });
  }
}
