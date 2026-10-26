import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { IEventoRepository } from '../domain/ports';
import type { Evento } from '../domain/evento';

/**
 * Caso de uso: listar eventos visibles para el usuario en un rango de
 * fechas.
 *
 * La visibilidad real la decide RLS en la base de datos; este caso de uso
 * solo aplica el filtro de rango, el filtro de agenda (`incluirOficiales =
 * 'agregados'` para la pestaña Agenda: solo tus PERSONAL + OFICIALES
 * agregados + INSTITUCIONAL) y la paginación. Decorar cada evento con
 * `participo` lo hace el repositorio en la misma transacción. El caller
 * (HTTP) es responsable de acotar el rango a un máximo razonable.
 */
export class ListarEventos {
  constructor(
    private readonly repo: IEventoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(
    claims: Claims,
    filtro: {
      desde: Date;
      hasta: Date;
      limit: number;
      offset: number;
      incluirOficiales: 'todos' | 'agregados';
    },
  ): Promise<Evento[]> {
    return this.uow.runAs(claims, async (tx) =>
      this.repo.listar(tx, {
        ...filtro,
        usuarioId: claims.sub,
      }),
    );
  }
}
