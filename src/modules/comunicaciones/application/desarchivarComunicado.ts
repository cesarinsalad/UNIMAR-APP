import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors';
import type { IComunicadoRepository } from '../domain/ports';
import type { Comunicado } from '../domain/comunicado';

/**
 * Caso de uso: desarchivar un comunicado ARCHIVADO.
 *
 * Restaura al estado BORRADOR (determinista): para volver a llegar a la
 * comunidad pasa de nuevo por revisión o publicación explícita del ADMIN,
 * así ninguna restauración revive el comunicado sin decisión editorial.
 * Limpia `aprobadoPor`/`publicadoAt` de su vida publicada anterior para
 * que el estado representado (BORRADOR) no cargue metadatos vencidos.
 */
export class DesarchivarComunicado {
  constructor(
    private readonly repo: IComunicadoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims, id: string): Promise<Comunicado> {
    return this.uow.runAs(claims, async (tx) => {
      const existente = await this.repo.buscarPorId(tx, id);
      if (!existente) {
        throw new NotFoundError('Comunicado no encontrado');
      }

      if (existente.estado !== 'ARCHIVADO') {
        throw new BadRequestError('Solo se puede desarchivar un comunicado archivado');
      }

      if (claims.role === 'COMUNICADOR' && existente.autorId !== claims.sub) {
        throw new ForbiddenError('No puedes desarchivar un comunicado que no creaste');
      }

      const restaurado = await this.repo.transicionarEstado(tx, id, {
        estado: 'BORRADOR',
        aprobadoPor: null,
        publicadoAt: null,
      });

      if (!restaurado) {
        throw new NotFoundError('Comunicado no encontrado tras desarchivar');
      }
      return restaurado;
    });
  }
}
