import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { IComunicadoRepository } from '../domain/ports';
import type { Estado } from '../domain/comunicado';

/**
 * Caso de uso: conteos de comunicados agrupados por estado (una sola query
 * `GROUP BY estado`), bajo RLS. Para el Panel de Gestión: números reales
 * en vez de cotas de la primera página del listado.
 */
export class ConteosComunicados {
  constructor(
    private readonly repo: IComunicadoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims): Promise<Record<Estado, number>> {
    return this.uow.runAs(claims, (tx) => this.repo.contarPorEstado(tx));
  }
}
