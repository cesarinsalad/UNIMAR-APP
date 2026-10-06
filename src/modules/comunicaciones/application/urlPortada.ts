import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { NotFoundError } from '../../../shared/errors';
import type { IComunicadoRepository, IStorageService } from '../domain/ports';

const TTL_PORTADA_SEG = 300;

/**
 * Caso de uso: obtener la URL firmada de la portada de un comunicado.
 *
 * Visibilidad del comunicado heredada por RLS (uow.runAs): quien puede ver
 * el comunicado puede ver su portada. TTL corto (300 s): la URL caduca
 * rápido y no queda expuesta más allá de la lectura inmediata.
 */
export class UrlPortada {
  constructor(
    private readonly comunicadoRepo: IComunicadoRepository,
    private readonly storage: IStorageService,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims, comunicadoId: string): Promise<{ url: string }> {
    return this.uow.runAs(claims, async (tx) => {
      const comunicado = await this.comunicadoRepo.buscarPorId(tx, comunicadoId);
      if (!comunicado) throw new NotFoundError('Comunicado no encontrado');
      if (!comunicado.imagenPath) {
        throw new NotFoundError('El comunicado no tiene portada');
      }
      const url = await this.storage.crearUrlDescargaFirmada(
        comunicado.imagenPath,
        TTL_PORTADA_SEG,
      );
      return { url };
    });
  }
}
