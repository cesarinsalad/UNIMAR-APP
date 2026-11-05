import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { IComunicadoRepository } from '../domain/ports';

/**
 * Resumen del Panel de Gestión: conteo por estado + alcance acumulado.
 * Todas las cifras salen bajo RLS (lo visible según claims), una sola tx.
 */
export interface ResumenComunicados {
  BORRADOR: number;
  PENDIENTE: number;
  PUBLICADO: number;
  ARCHIVADO: number;
  /**
   * Sumatoria de lecturas confirmadas de los comunicados visibles.
   * Quirk conocido: un COMUNICADOR no-autor ve 0 por la RLS de
   * `comunicado_lecturas` (mirror de `GET /:id/estadisticas`).
   */
  lecturasTotales: number;
}

/**
 * Caso de uso: conteos de comunicados agrupados por estado (`GROUP BY
 * estado`) + lecturas totales, bajo RLS. Para el Resumen de gestión:
 * números reales en vez de cotas de la primera página del listado.
 */
export class ConteosComunicados {
  constructor(
    private readonly repo: IComunicadoRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async ejecutar(claims: Claims): Promise<ResumenComunicados> {
    return this.uow.runAs(claims, async (tx) => {
      // Secuencial (no Promise.all): el mismo DbTx sirve ambas consultas
      // en orden, por disciplina de transacción.
      const porEstado = await this.repo.contarPorEstado(tx);
      const lecturasTotales = await this.repo.contarLecturasTotales(tx);
      return {
        BORRADOR: porEstado.BORRADOR,
        PENDIENTE: porEstado.PENDIENTE,
        PUBLICADO: porEstado.PUBLICADO,
        ARCHIVADO: porEstado.ARCHIVADO,
        lecturasTotales,
      };
    });
  }
}
