import type { DbTx } from '../../../shared/kernel/db';
import type { IEventoRepository } from '../domain/ports';
import type { Evento } from '../domain/evento';

interface EventoRow {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: 'OFICIAL' | 'PERSONAL';
  usuario_id: string;
  inicio_at: Date;
  fin_at: Date | null;
  dia_completo: boolean;
  recordatorio_minutos: number | null;
  created_at: Date;
  decanato_ids: number[];
}

function mapRow(row: EventoRow): Evento {
  return {
    id: row.id,
    titulo: row.titulo,
    descripcion: row.descripcion,
    tipo: row.tipo,
    usuarioId: row.usuario_id,
    inicioAt: row.inicio_at,
    finAt: row.fin_at,
    diaCompleto: row.dia_completo,
    recordatorioMinutos: row.recordatorio_minutos,
    createdAt: row.created_at,
    decanatoIds: row.decanato_ids ?? [],
  };
}

const BASE_SELECT = `
  SELECT
    e.*,
    COALESCE(array_agg(ea.decanato_id) FILTER (WHERE ea.decanato_id IS NOT NULL), '{}') AS decanato_ids
  FROM eventos e
  LEFT JOIN evento_audiencias ea ON ea.evento_id = e.id
`;

/**
 * Implementación de IEventoRepository sobre PostgreSQL.
 *
 * Disciplina de transacción: cada método recibe una `DbTx` explícita porque
 * la política RLS del componente evalúa los claims del usuario autenticado
 * dentro del UnitOfWork del BFF (nunca fuera de él). Los datos se mapean
 * de snake_case (DB) a camelCase (dominio), y las audiencias se agregan
 * con `array_agg` en la misma consulta para devolver el evento completo.
 */
export class PostgresEventoRepository implements IEventoRepository {
  async crear(
    tx: DbTx,
    input: {
      titulo: string;
      descripcion: string | null;
      tipo: 'OFICIAL' | 'PERSONAL';
      usuarioId: string;
      inicioAt: string;
      finAt: string | null;
      diaCompleto: boolean;
      recordatorioMinutos: number | null;
    },
  ): Promise<Evento> {
    const result = await tx.query<{ id: string }>(
      `INSERT INTO eventos (titulo, descripcion, tipo, usuario_id, inicio_at, fin_at, dia_completo, recordatorio_minutos)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        input.titulo,
        input.descripcion,
        input.tipo,
        input.usuarioId,
        input.inicioAt,
        input.finAt,
        input.diaCompleto,
        input.recordatorioMinutos,
      ],
    );
    const id = result.rows[0]?.id;
    if (!id) throw new Error('No se pudo crear el evento');
    const fetched = await this.buscarPorId(tx, id);
    if (!fetched) throw new Error('No se pudo recuperar el evento recién creado');
    return fetched;
  }

  async agregarAudiencias(tx: DbTx, eventoId: string, decanatoIds: number[]): Promise<void> {
    if (decanatoIds.length === 0) return;
    await tx.query(
      'INSERT INTO evento_audiencias (evento_id, decanato_id) SELECT $1, unnest($2::int[])',
      [eventoId, decanatoIds],
    );
  }

  async buscarPorId(tx: DbTx, id: string): Promise<Evento | null> {
    const result = await tx.query<EventoRow>(
      `${BASE_SELECT} WHERE e.id = $1 GROUP BY e.id`,
      [id],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async listar(
    tx: DbTx,
    filtro: { desde: Date; hasta: Date; limit: number; offset: number },
  ): Promise<Evento[]> {
    const result = await tx.query<EventoRow>(
      `${BASE_SELECT}
        WHERE e.inicio_at >= $1 AND e.inicio_at <= $2
        GROUP BY e.id
        ORDER BY e.inicio_at ASC
        LIMIT $3 OFFSET $4`,
      [filtro.desde, filtro.hasta, filtro.limit, filtro.offset],
    );
    return result.rows.map(mapRow);
  }

  async actualizar(
    tx: DbTx,
    id: string,
    input: {
      titulo?: string;
      descripcion?: string | null;
      inicioAt?: string;
      finAt?: string | null;
      diaCompleto?: boolean;
      recordatorioMinutos?: number | null;
      decanatoIds?: number[];
    },
  ): Promise<Evento | null> {
    const sets: string[] = [];
    const values: (string | number | boolean | null)[] = [];

    if (input.titulo !== undefined) {
      sets.push(`titulo = $${sets.length + 1}`);
      values.push(input.titulo);
    }
    if (input.descripcion !== undefined) {
      sets.push(`descripcion = $${sets.length + 1}`);
      values.push(input.descripcion);
    }
    if (input.inicioAt !== undefined) {
      sets.push(`inicio_at = $${sets.length + 1}`);
      values.push(input.inicioAt);
    }
    if (input.finAt !== undefined) {
      sets.push(`fin_at = $${sets.length + 1}`);
      values.push(input.finAt);
    }
    if (input.diaCompleto !== undefined) {
      sets.push(`dia_completo = $${sets.length + 1}`);
      values.push(input.diaCompleto);
    }
    if (input.recordatorioMinutos !== undefined) {
      sets.push(`recordatorio_minutos = $${sets.length + 1}`);
      values.push(input.recordatorioMinutos);
    }

    if (sets.length > 0) {
      values.push(id);
      await tx.query(
        `UPDATE eventos SET ${sets.join(', ')} WHERE id = $${values.length}`,
        values,
      );
    }

    if (input.decanatoIds !== undefined) {
      await tx.query('DELETE FROM evento_audiencias WHERE evento_id = $1', [id]);
      await this.agregarAudiencias(tx, id, input.decanatoIds);
    }

    return this.buscarPorId(tx, id);
  }

  async eliminar(tx: DbTx, id: string): Promise<boolean> {
    const result = await tx.query<{ id: string }>(
      'DELETE FROM eventos WHERE id = $1 RETURNING id',
      [id],
    );
    return result.rows.length > 0;
  }

  async eventosConRecordatorioPendiente(
    tx: DbTx,
    ventanaSegundos: number,
  ): Promise<Evento[]> {
    // Buscamos eventos cuyo momento de recordatorio (inicio_at -
    // recordatorio_minutos minutos) haya caído dentro de la ventana
    // [now() - ventanaSegundos, now()]. El uso de `(||)` permite pasar el
    // parámetro como texto sin riesgo de inyección.
    const result = await tx.query<EventoRow>(
      `${BASE_SELECT}
        WHERE e.recordatorio_minutos IS NOT NULL
          AND e.inicio_at - (e.recordatorio_minutos || ' minutes')::interval
              BETWEEN now() - ($1 || ' seconds')::interval AND now()
        GROUP BY e.id`,
      [String(ventanaSegundos)],
    );
    return result.rows.map(mapRow);
  }

  async destinatariosDeEvento(tx: DbTx, evento: Evento): Promise<string[]> {
    if (evento.tipo === 'PERSONAL') {
      return [evento.usuarioId];
    }
    // OFICIAL: excluye al creador para no duplicar con el fan-out inicial.
    if (evento.decanatoIds.length === 0) {
      const r = await tx.query<{ id: string }>(
        'SELECT id FROM usuarios WHERE id <> $1',
        [evento.usuarioId],
      );
      return r.rows.map((row) => row.id);
    }
    const r = await tx.query<{ id: string }>(
      'SELECT id FROM usuarios WHERE id <> $1 AND decanato_id = ANY($2::int[])',
      [evento.usuarioId, evento.decanatoIds],
    );
    return r.rows.map((row) => row.id);
  }

  async filtrarYaEnviados(
    tx: DbTx,
    eventoId: string,
    usuarioIds: string[],
  ): Promise<string[]> {
    if (usuarioIds.length === 0) return [];
    const r = await tx.query<{ usuario_id: string }>(
      'SELECT usuario_id FROM evento_recordatorios_enviados WHERE evento_id = $1 AND usuario_id = ANY($2::uuid[])',
      [eventoId, usuarioIds],
    );
    const yaEnviados = new Set(r.rows.map((row) => row.usuario_id));
    return usuarioIds.filter((id) => !yaEnviados.has(id));
  }

  async marcarRecordatoriosEnviados(
    tx: DbTx,
    eventoId: string,
    usuarioIds: string[],
  ): Promise<void> {
    if (usuarioIds.length === 0) return;
    await tx.query(
      'INSERT INTO evento_recordatorios_enviados (evento_id, usuario_id) SELECT $1, unnest($2::uuid[]) ON CONFLICT DO NOTHING',
      [eventoId, usuarioIds],
    );
  }
}
