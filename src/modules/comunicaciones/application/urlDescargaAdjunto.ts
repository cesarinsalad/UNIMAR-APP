import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { NotFoundError } from '../../../shared/errors';
import type { IAdjuntoRepository, IStorageService } from '../domain/ports';

const TTL_DESCARGA_SEGUNDOS = 300;

/**
 * Caso de uso: generar una URL firmada de descarga para un adjunto.
 *
 * La RLS en comunicado_adjuntos (SELECT) garantiza que solo quienes pueden ver
 * el comunicado padre puedan solicitar la descarga.
 */
export class UrlDescargaAdjunto {
  constructor(
    private readonly adjuntoRepo: IAdjuntoRepository,
    private readonly storage: IStorageService,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims, adjuntoId: string): Promise<{ url: string }> {
    return this.uow.runAs(claims, async (tx) => {
      const adjunto = await this.adjuntoRepo.buscarPorId(tx, adjuntoId);
      if (!adjunto) {
        throw new NotFoundError('Adjunto no encontrado');
      }

      const url = await this.storage.crearUrlDescargaFirmada(
        adjunto.storagePath,
        TTL_DESCARGA_SEGUNDOS,
      );

      return { url };
    });
  }
}
