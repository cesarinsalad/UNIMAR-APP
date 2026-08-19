import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import { BadRequestError, ForbiddenError } from '../../../shared/errors';
import type { IComunicadoRepository } from '../domain/ports';
import type { Comunicado, CrearComunicadoInput } from '../domain/comunicado';

/**
 * Caso de uso: crear un comunicado nuevo.
 *
 * Regla clave (anti-global): un COMUNICADOR solo puede dirigirse a su propio
 * decanato; nunca puede crear un comunicado sin audiencia (eso sería GLOBAL).
 * El ADMIN sí puede publicar a cualquier audiencia, incluida [] para GLOBAL.
 */
export class CrearComunicado {
  constructor(
    private readonly repo: IComunicadoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims, input: CrearComunicadoInput): Promise<Comunicado> {
    if (claims.role === 'ESTUDIANTE') {
      throw new ForbiddenError('Solo comunicadores o administradores pueden crear comunicados');
    }

    if (claims.role === 'COMUNICADOR') {
      if (
        input.decanatoIds.length !== 1 ||
        input.decanatoIds[0] !== claims.decanato_id
      ) {
        throw new BadRequestError(
          'El comunicador solo puede dirigirse a su propio decanato',
        );
      }
    }

    return this.uow.runAs(claims, async (tx) => {
      const creado = await this.repo.crear(tx, {
        titulo: input.titulo,
        cuerpo: input.cuerpo,
        autorId: claims.sub,
        programadoPara: input.programadoPara ?? null,
        expiraAt: input.expiraAt ?? null,
      });

      await this.repo.agregarAudiencias(tx, creado.id, input.decanatoIds);

      // Devolvemos el comunicado completo, incluyendo las audiencias recién creadas.
      const completo = await this.repo.buscarPorId(tx, creado.id);
      if (!completo) {
        throw new Error('El comunicado recién creado no se encontró');
      }
      return completo;
    });
  }
}
