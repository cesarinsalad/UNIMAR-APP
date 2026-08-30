import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { EventBus } from '../../../shared/kernel/eventos';
import { BadRequestError, ForbiddenError } from '../../../shared/errors';
import type { IEventoRepository } from '../domain/ports';
import type { CrearEventoInput, Evento } from '../domain/evento';

/**
 * Caso de uso: crear un evento nuevo.
 *
 * Reglas:
 *  - PERSONAL: cualquier usuario autenticado. `usuario_id` se toma siempre
 *    de los claims.
 *  - OFICIAL: solo ADMIN o COMUNICADOR. La política RLS de `eventos` ya
 *    bloquea al ESTUDIANTE; aquí reforzamos la regla anti-global del
 *    COMUNICADOR (audiencia ⊆ su propio decanato).
 *  - ADMIN puede crear OFICIAL GLOBAL (audiencia vacía) o local.
 *
 * Si el evento es OFICIAL y se inyecta un `EventBus`, se emite
 * `EVENTO_OFICIAL_CREADO` durante el tx para que Notificaciones haga el
 * fan-out (notificación in-app + push). Sin bus: comportamiento idéntico.
 */
export class CrearEvento {
  constructor(
    private readonly repo: IEventoRepository,
    private readonly uow: UnitOfWork,
    private readonly eventos?: EventBus,
  ) {}

  async ejecutar(claims: Claims, input: CrearEventoInput): Promise<Evento> {
    this.validarPermisos(claims, input);
    this.validarFechas(input);

    const { evento, jobs } = await this.uow.runAs(claims, async (tx) => {
      const creado = await this.repo.crear(tx, {
        titulo: input.titulo,
        descripcion: input.descripcion ?? null,
        tipo: input.tipo,
        usuarioId: claims.sub,
        inicioAt: input.inicioAt,
        finAt: input.finAt ?? null,
        diaCompleto: input.diaCompleto ?? false,
        recordatorioMinutos: input.recordatorioMinutos ?? null,
      });

      if (input.tipo === 'OFICIAL' && input.decanatoIds && input.decanatoIds.length > 0) {
        await this.repo.agregarAudiencias(tx, creado.id, input.decanatoIds);
      }

      const completo = await this.repo.buscarPorId(tx, creado.id);
      if (!completo) throw new Error('No se pudo recuperar el evento recién creado');

      const jobs =
        this.eventos && input.tipo === 'OFICIAL'
          ? await this.eventos.publicar({
              tipo: 'EVENTO_OFICIAL_CREADO',
              tx,
              eventoId: completo.id,
              titulo: completo.titulo,
              autorId: completo.usuarioId,
              decanatoIds: completo.decanatoIds,
            })
          : [];

      return { evento: completo, jobs };
    });

    for (const job of jobs) {
      try {
        await job();
      } catch (err) {
        console.error('[calendario:crear] job post-commit falló:', err);
      }
    }

    return evento;
  }

  private validarPermisos(claims: Claims, input: CrearEventoInput): void {
    if (input.tipo === 'OFICIAL') {
      if (claims.role !== 'ADMIN' && claims.role !== 'COMUNICADOR') {
        throw new ForbiddenError('Solo ADMIN o COMUNICADOR pueden crear eventos oficiales');
      }
      if (claims.role === 'COMUNICADOR') {
        if (
          !input.decanatoIds ||
          input.decanatoIds.length !== 1 ||
          input.decanatoIds[0] !== claims.decanato_id
        ) {
          throw new BadRequestError(
            'El comunicador solo puede crear eventos oficiales para su propio decanato',
          );
        }
      }
    }
  }

  private validarFechas(input: CrearEventoInput): void {
    if (input.finAt && new Date(input.finAt) < new Date(input.inicioAt)) {
      throw new BadRequestError('fin_at debe ser mayor o igual a inicio_at');
    }
  }
}
