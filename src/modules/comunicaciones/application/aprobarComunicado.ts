import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors';
import type { IComunicadoRepository } from '../domain/ports';
import type { Comunicado } from '../domain/comunicado';

/**
 * Caso de uso: aprobar un comunicado PENDIENTE.
 *
 * Solo ADMIN. Al aprobarse pasa a PUBLICADO, se registra quién aprobó y cuándo,
 * y opcionalmente se ajustan las fechas de programación/expiración.
 *
 * En el Paso 3 aquí se enganchará el fan-out de notificaciones push/in-app.
 */
export class AprobarComunicado {
  constructor(
    private readonly repo: IComunicadoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(
    claims: Claims,
    id: string,
    input: { programadoPara?: string | null; expiraAt?: string | null },
  ): Promise<Comunicado> {
    if (claims.role !== 'ADMIN') {
      throw new ForbiddenError('Solo el administrador puede aprobar comunicados');
    }

    return this.uow.runAs(claims, async (tx) => {
      const existente = await this.repo.buscarPorId(tx, id);
      if (!existente) {
        throw new NotFoundError('Comunicado no encontrado');
      }

      if (existente.estado !== 'PENDIENTE') {
        throw new BadRequestError('Solo se puede aprobar un comunicado en revisión');
      }

      const actualizado = await this.repo.transicionarEstado(tx, id, {
        estado: 'PUBLICADO',
        aprobadoPor: claims.sub,
        publicadoAt: new Date(),
        motivoRechazo: null,
        programadoPara: input.programadoPara,
        expiraAt: input.expiraAt,
      });

      if (!actualizado) {
        throw new NotFoundError('Comunicado no encontrado tras aprobar');
      }
      return actualizado;
    });
  }
}
