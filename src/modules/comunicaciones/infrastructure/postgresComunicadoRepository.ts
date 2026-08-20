import type { DbTx } from '../../../shared/kernel/db';
import type { IComunicadoRepository } from '../domain/ports';
import type { Comunicado, Estado } from '../domain/comunicado';

interface ComunicadoRow {
  id: string;
  titulo: string;
  cuerpo: string;
  autor_id: string;
  estado: Estado;
  aprobado_por: string | null;
  motivo_rechazo: string | null;
  publicado_at: Date | null;
  programado_para: Date | null;
  expira_at: Date | null;
  created_at: Date;
  updated_at: Date;
  decanato_ids: number[];
}

function mapRow(row: ComunicadoRow): Comunicado {
  return {
    id: row.id,
    titulo: row.titulo,
    cuerpo: row.cuerpo,
    autorId: row.autor_id,
    estado: row.estado,
    aprobadoPor: row.aprobado_por,
    motivoRechazo: row.motivo_rechazo,
    publicadoAt: row.publicado_at,
    programadoPara: row.programado_para,
    expiraAt: row.expira_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    decanatoIds: row.decanato_ids ?? [],
  };
}

const BASE_SELECT = `
  SELECT
    c.*,
    COALESCE(array_agg(ca.decanato_id) FILTER (WHERE ca.decanato_id IS NOT NULL), '{}') AS decanato_ids
  FROM comunicados c
  LEFT JOIN comunicado_audiencias ca ON ca.comunicado_id = c.id
`;

/**
 * Implementación de IComunicadoRepository sobre PostgreSQL.
 *
 * Disciplina de transacción: cada método recibe una `DbTx` explícita porque la
 * política RLS del componente evalúa los claims del usuario autenticado dentro
 * del UnitOfWork del BFF (nunca fuera de él). Los datos se mapean de
 * snake_case (DB) a camelCase (dominio), y las audiencias se agregan con
 * `array_agg` en la misma consulta para devolver el comunicado completo.
 */
export class PostgresComunicadoRepository implements IComunicadoRepository {
  async crear(
    tx: DbTx,
    input: {
      titulo: string;
      cuerpo: string;
      autorId: string;
      programadoPara: string | null;
      expiraAt: string | null;
    },
  ): Promise<Comunicado> {
    const insert = await tx.query<{ id: string }>(
      `INSERT INTO comunicados (titulo, cuerpo, autor_id, programado_para, expira_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [input.titulo, input.cuerpo, input.autorId, input.programadoPara, input.expiraAt],
    );
    const id = insert.rows[0]?.id;
    if (!id) {
      throw new Error('No se pudo crear el comunicado');
    }
    const result = await tx.query<ComunicadoRow>(
      `${BASE_SELECT} WHERE c.id = $1 GROUP BY c.id`,
      [id],
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error('No se pudo recuperar el comunicado recién creado');
    }
    return mapRow(row);
  }

  async agregarAudiencias(
    tx: DbTx,
    comunicadoId: string,
    decanatoIds: number[],
  ): Promise<void> {
    if (decanatoIds.length === 0) return;
    await tx.query(
      'INSERT INTO comunicado_audiencias (comunicado_id, decanato_id) SELECT $1, unnest($2::int[])',
      [comunicadoId, decanatoIds],
    );
  }

  async buscarPorId(tx: DbTx, id: string): Promise<Comunicado | null> {
    const result = await tx.query<ComunicadoRow>(
      `${BASE_SELECT} WHERE c.id = $1 GROUP BY c.id`,
      [id],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async listar(
    tx: DbTx,
    filtro: { estado?: Estado; limit: number; offset: number },
  ): Promise<Comunicado[]> {
    const params: (string | number)[] = [];
    const where: string[] = [];

    if (filtro.estado) {
      params.push(filtro.estado);
      where.push(`c.estado = $${params.length}`);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    params.push(filtro.limit, filtro.offset);

    const result = await tx.query<ComunicadoRow>(
      `${BASE_SELECT} ${whereSql} GROUP BY c.id ORDER BY c.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return result.rows.map(mapRow);
  }

  async actualizar(
    tx: DbTx,
    id: string,
    input: {
      titulo?: string;
      cuerpo?: string;
      programadoPara?: string | null;
      expiraAt?: string | null;
      decanatoIds?: number[];
    },
  ): Promise<Comunicado | null> {
    const sets: string[] = [];
    const values: (string | null)[] = [];

    if (input.titulo !== undefined) {
      sets.push(`titulo = $${sets.length + 1}`);
      values.push(input.titulo);
    }
    if (input.cuerpo !== undefined) {
      sets.push(`cuerpo = $${sets.length + 1}`);
      values.push(input.cuerpo);
    }
    if (input.programadoPara !== undefined) {
      sets.push(`programado_para = $${sets.length + 1}`);
      values.push(input.programadoPara);
    }
    if (input.expiraAt !== undefined) {
      sets.push(`expira_at = $${sets.length + 1}`);
      values.push(input.expiraAt);
    }

    if (sets.length > 0) {
      values.push(id);
      await tx.query(
        `UPDATE comunicados SET ${sets.join(', ')} WHERE id = $${values.length}`,
        values,
      );
    }

    if (input.decanatoIds !== undefined) {
      await tx.query('DELETE FROM comunicado_audiencias WHERE comunicado_id = $1', [id]);
      await this.agregarAudiencias(tx, id, input.decanatoIds);
    }

    return this.buscarPorId(tx, id);
  }

  async transicionarEstado(
    tx: DbTx,
    id: string,
    input: {
      estado: Estado;
      aprobadoPor?: string | null;
      motivoRechazo?: string | null;
      publicadoAt?: Date | null;
      programadoPara?: string | null;
      expiraAt?: string | null;
    },
  ): Promise<Comunicado | null> {
    const sets: string[] = [];
    const values: (string | Date | null)[] = [];

    sets.push(`estado = $${sets.length + 1}`);
    values.push(input.estado);

    if (input.aprobadoPor !== undefined) {
      sets.push(`aprobado_por = $${sets.length + 1}`);
      values.push(input.aprobadoPor);
    }
    if (input.motivoRechazo !== undefined) {
      sets.push(`motivo_rechazo = $${sets.length + 1}`);
      values.push(input.motivoRechazo);
    }
    if (input.publicadoAt !== undefined) {
      sets.push(`publicado_at = $${sets.length + 1}`);
      values.push(input.publicadoAt);
    }
    if (input.programadoPara !== undefined) {
      sets.push(`programado_para = $${sets.length + 1}`);
      values.push(input.programadoPara);
    }
    if (input.expiraAt !== undefined) {
      sets.push(`expira_at = $${sets.length + 1}`);
      values.push(input.expiraAt);
    }

    values.push(id);
    await tx.query(
      `UPDATE comunicados SET ${sets.join(', ')} WHERE id = $${values.length}`,
      values,
    );

    return this.buscarPorId(tx, id);
  }

  async registrarLectura(
    tx: DbTx,
    comunicadoId: string,
    usuarioId: string,
  ): Promise<void> {
    await tx.query(
      'INSERT INTO comunicado_lecturas (comunicado_id, usuario_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [comunicadoId, usuarioId],
    );
  }

  async contarLecturas(tx: DbTx, comunicadoId: string): Promise<number> {
    const result = await tx.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM comunicado_lecturas WHERE comunicado_id = $1',
      [comunicadoId],
    );
    return result.rows[0]?.n ?? 0;
  }
}
