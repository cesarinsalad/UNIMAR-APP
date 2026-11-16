import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { NotFoundError } from '../../../shared/errors';
import type { Adjunto } from '../domain/adjunto';
import type { IComunicadoRepository, IAdjuntoRepository } from '../domain/ports';

/**
 * Caso de uso: listar los adjuntos visibles de un comunicado.
 *
 * La visibilidad real la controla RLS: si el usuario no puede ver el
 * comunicado, `buscarPorId` devuelve null y respondemos 404.
 */
export class ListarAdjuntos {
  constructor(
    private readonly comunicadoRepo: IComunicadoRepository,
    private readonly adjuntoRepo: IAdjuntoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims, comunicadoId: string): Promise<Adjunto[]> {
    return this.uow.runAs(claims, async (tx) => {
      const comunicado = await this.comunicadoRepo.buscarPorId(tx, comunicadoId);
      if (!comunicado) {
        throw new NotFoundError('Comunicado no encontrado');
      }

      const adjuntos = await this.adjuntoRepo.listarPorComunicado(tx, comunicadoId);
      // La portada vive como adjunto en Storage, pero no es un adjunto del
      // comunicado: se excluye la que está vigente (imagen_path).
      return comunicado.imagenPath
        ? adjuntos.filter((adjunto) => adjunto.storagePath !== comunicado.imagenPath)
        : adjuntos;
    });
  }
}
