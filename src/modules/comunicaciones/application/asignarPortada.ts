import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors';
import type { IAdjuntoRepository } from '../domain/ports';
import type { IComunicadoRepository } from '../domain/ports';
import type { Comunicado, Estado } from '../domain/comunicado';

const ESTADOS_ASIGNABLES: Estado[] = ['BORRADOR', 'PUBLICADO'];
const MIMES_PORTADA = ['image/png', 'image/jpeg'];

/**
 * Caso de uso: asignar (o quitar, con adjuntoId=null) la imagen de portada
 * de un comunicado.
 *
 * Reglas:
 * - Mismos permisos que EditarComunicado: estado en BORRADOR/PUBLICADO;
 *   COMUNICADOR solo sobre comunicados propios.
 * - El asset de portada debe estar REGISTRADO como adjunto del propio
 *   comunicado y ser image/png|jpeg (la subida/registro ya pasó por los
 *   validadores y RLS del flujo de adjuntos).
 * - adjuntoId === null limpia la portada (DELETE /:id/portada).
 */
export class AsignarPortada {
  constructor(
    private readonly comunicadoRepo: IComunicadoRepository,
    private readonly adjuntoRepo: IAdjuntoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(
    claims: Claims,
    comunicadoId: string,
    adjuntoId: string | null,
  ): Promise<Comunicado> {
    return this.uow.runAs(claims, async (tx) => {
      const comunicado = await this.comunicadoRepo.buscarPorId(tx, comunicadoId);
      if (!comunicado) {
        throw new NotFoundError('Comunicado no encontrado');
      }

      if (!ESTADOS_ASIGNABLES.includes(comunicado.estado)) {
        throw new BadRequestError(
          `No se puede editar un comunicado en estado ${comunicado.estado}`,
        );
      }

      if (claims.role === 'COMUNICADOR' && comunicado.autorId !== claims.sub) {
        throw new ForbiddenError('No puedes editar un comunicado que no creaste');
      }

      if (adjuntoId === null) {
        const limpio = await this.comunicadoRepo.asignarPortada(tx, comunicadoId, null);
        if (!limpio) throw new NotFoundError('Comunicado no encontrado tras actualizar');
        return limpio;
      }

      const adjunto = await this.adjuntoRepo.buscarPorId(tx, adjuntoId);
      if (!adjunto) {
        throw new BadRequestError('Adjunto no encontrado');
      }
      if (adjunto.comunicadoId !== comunicadoId) {
        throw new BadRequestError('El adjunto no pertenece a este comunicado');
      }
      if (!MIMES_PORTADA.includes(adjunto.mimeType)) {
        throw new BadRequestError('La portada debe ser una imagen PNG o JPEG');
      }

      const actualizado = await this.comunicadoRepo.asignarPortada(
        tx,
        comunicadoId,
        adjunto.storagePath,
      );
      if (!actualizado) throw new NotFoundError('Comunicado no encontrado tras actualizar');
      return actualizado;
    });
  }
}
