import type { Claims } from '../../../shared/security/jwt';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { IComunicadoRepository } from '../domain/ports';
import type { AlcanceComunicado } from '../domain/comunicado';

const DIAS_TASA_LECTURA = 30;
const RECIENTES_PARA_GRAFICO = 4;

export interface LecturaReciente {
  id: string;
  titulo: string;
  lecturas: number;
  audiencia: number;
  /** Porcentaje 0–100; null si el comunicado no tiene audiencia objetivo. */
  tasa: number | null;
}

/**
 * Resumen del Panel de Gestión: conteo por estado + tasa de lectura efectiva
 * del último periodo + los publicados recientes para el gráfico comparativo.
 * Todas las cifras salen bajo el alcance de las claims (RLS + función
 * agregada segura `alcance_comunicados`), en una sola tx.
 */
export interface ResumenComunicados {
  BORRADOR: number;
  PENDIENTE: number;
  PUBLICADO: number;
  ARCHIVADO: number;
  /** Promedio aritmético de las tasas del periodo; null si no hay datos. */
  tasaLecturaPromedio30d: number | null;
  /** Publicados del periodo con audiencia > 0 usados en el promedio. */
  publicacionesAnalizadas: number;
  /** Hasta 4 publicados recientes, ordenados por fecha descendente. */
  recientes: LecturaReciente[];
}

function tasaPorcentaje(lecturas: number, audiencia: number): number | null {
  if (audiencia <= 0) return null;
  return Math.min(100, (lecturas / audiencia) * 100);
}

function redondear1(valor: number): number {
  return Math.round(valor * 10) / 10;
}

/**
 * Caso de uso: conteos de comunicados agrupados por estado (`GROUP BY
 * estado`) + tasa de lectura efectiva de los últimos 30 días. Para el
 * Resumen de gestión: números reales en vez de cotas de la primera página
 * del listado y diagnóstico de alcance por comunicado.
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
      const alcance = await this.repo.listarAlcanceComunicados(tx, DIAS_TASA_LECTURA);

      const tasas = alcance
        .map((item) => tasaPorcentaje(item.lecturas, item.audiencia))
        .filter((tasa): tasa is number => tasa !== null);

      const tasaLecturaPromedio30d =
        tasas.length > 0
          ? redondear1(tasas.reduce((total, tasa) => total + tasa, 0) / tasas.length)
          : null;

      const recientes = [...alcance]
        .sort((a, b) => b.publicadoAt.getTime() - a.publicadoAt.getTime())
        .slice(0, RECIENTES_PARA_GRAFICO)
        .map((item) => this.aLecturaReciente(item));

      return {
        BORRADOR: porEstado.BORRADOR,
        PENDIENTE: porEstado.PENDIENTE,
        PUBLICADO: porEstado.PUBLICADO,
        ARCHIVADO: porEstado.ARCHIVADO,
        tasaLecturaPromedio30d,
        publicacionesAnalizadas: tasas.length,
        recientes,
      };
    });
  }

  private aLecturaReciente(item: AlcanceComunicado): LecturaReciente {
    const tasa = tasaPorcentaje(item.lecturas, item.audiencia);
    return {
      id: item.id,
      titulo: item.titulo,
      lecturas: item.lecturas,
      audiencia: item.audiencia,
      tasa: tasa === null ? null : redondear1(tasa),
    };
  }
}
