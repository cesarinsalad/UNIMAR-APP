import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { EventBus } from '../../../shared/kernel/eventos';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors';
import type { IComunicadoRepository } from '../domain/ports';
import type { Comunicado } from '../domain/comunicado';

/**
 * Caso de uso: aprobar un comunicado PENDIENTE.
 *
 * Solo ADMIN. Al aprobarse pasa a PUBLICADO, se registra quién aprobó y cuándo,
 * y opcionalmente se ajustan las fechas de programación/expiración.
 *
 * Si se inyecta un `EventBus`, emite `COMUNICADO_PUBLICADO` dentro del tx
 * (fan-out inserta filas en `notificaciones`); post-COMMIT, los jobs de push
 * devueltos por los suscriptores se ejecutan best-effort: si fallan no se
 * revierte la aprobación. Si `programado_para` es futuro, las notificaciones
 * se generan de inmediato (no hay jobs programados en v1).
 */
export class AprobarComunicado {
  constructor(
    private readonly repo: IComunicadoRepository,
    private readonly uow: UnitOfWork,
    private readonly eventos?: EventBus,
  ) {}

  async ejecutar(
    claims: Claims,
    id: string,
    input: { programadoPara?: string | null; expiraAt?: string | null },
  ): Promise<Comunicado> {
    if (claims.role !== 'ADMIN') {
      throw new ForbiddenError('Solo el administrador puede aprobar comunicados');
    }

    const { comunicado, jobs } = await this.uow.runAs(claims, async (tx) => {
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

      const jobs = this.eventos
        ? await this.eventos.publicar({
            tipo: 'COMUNICADO_PUBLICADO',
            tx,
            comunicadoId: actualizado.id,
            titulo: actualizado.titulo,
            autorId: actualizado.autorId,
            decanatoIds: actualizado.decanatoIds,
          })
        : [];

      return { comunicado: actualizado, jobs };
    });

    await ejecutarJobs(jobs);

    return comunicado;
  }
}

async function ejecutarJobs(jobs: Array<() => Promise<void>>): Promise<void> {
  for (const job of jobs) {
    try {
      await job();
    } catch (err) {
      console.error('[comunicaciones:publicado] job post-commit falló:', err);
    }
  }
}
