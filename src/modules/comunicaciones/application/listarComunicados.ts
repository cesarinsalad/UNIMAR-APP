import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { IComunicadoRepository } from '../domain/ports';
import type { Comunicado, Estado } from '../domain/comunicado';

/**
 * Página del listado con total conocido. El total se calcula bajo las mismas
 * claims (RLS recorta count e items idéntico), así la UI puede paginar con
 * "N de M" en vez de encadenar offsets a ciegas.
 */
export interface PaginaComunicados {
  items: Comunicado[];
  total: number;
}

/**
 * Caso de uso: listar comunicados visibles para el usuario autenticado.
 *
 * La visibilidad real la decide RLS en la base de datos; este caso de uso solo
 * aplica filtros y paginación. Un ESTUDIANTE que filtre por estado=BORRADOR
 * simplemente recibirá una lista vacía, no un error.
 */
export class ListarComunicados {
  constructor(
    private readonly repo: IComunicadoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(
    claims: Claims,
    filtro: {
      estado?: Estado;
      categoria?: string;
      /** Búsqueda textual: título O cuerpo (ILIKE). */
      q?: string;
      limit: number;
      offset: number;
    },
  ): Promise<PaginaComunicados> {
    return this.uow.runAs(claims, async (tx) => {
      const [items, total] = await Promise.all([
        this.repo.listar(tx, filtro),
        this.repo.contar(tx, { estado: filtro.estado, categoria: filtro.categoria, q: filtro.q }),
      ]);
      return { items, total };
    });
  }
}
