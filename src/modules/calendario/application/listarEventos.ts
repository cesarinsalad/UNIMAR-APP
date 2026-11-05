import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { IEventoRepository } from '../domain/ports';
import type { Evento } from '../domain/evento';
import type { TipoEvento } from '../domain/evento';

/**
 * Página del listado con total conocido. El total se calcula bajo las mismas
 * claims (RLS recorta count e items idéntico), así la UI puede paginar con
 * "N de M" en vez de encadenar offsets a ciegas.
 */
export interface PaginaEventos {
  items: Evento[];
  total: number;
}

/**
 * Caso de uso: listar eventos visibles para el usuario en un rango de
 * fechas.
 *
 * La visibilidad real la decide RLS en la base de datos; este caso de uso
 * solo aplica el filtro de rango, el filtro de agenda (`incluirOficiales =
 * 'agregados'` para la pestaña Agenda: solo tus PERSONAL + OFICIALES
 * agregados + INSTITUCIONAL/FERIADO) y la paginación. Decorar cada evento con
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
      /** Recorte por naturaleza (consola de gestión). */
      tipo?: TipoEvento;
      /** Búsqueda textual título O lugar (consola de gestión). */
      q?: string;
    },
  ): Promise<PaginaEventos> {
    return this.uow.runAs(claims, async (tx) => {
      // Secuencial (no Promise.all) por disciplina de transacción: el mismo
      // DbTx sirve dos consultas en orden.
      const items = await this.repo.listar(tx, {
        ...filtro,
        usuarioId: claims.sub,
      });
      const total = await this.repo.contar(tx, {
        desde: filtro.desde,
        hasta: filtro.hasta,
        usuarioId: claims.sub,
        incluirOficiales: filtro.incluirOficiales,
        tipo: filtro.tipo,
        q: filtro.q,
      });
      return { items, total };
    });
  }
}
