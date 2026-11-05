import type { DbTx } from '../../../shared/kernel/db';
import type { IEventoRepository } from '../domain/ports';
import type { Evento, TipoEvento } from '../domain/evento';

interface EventoRow {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: 'OFICIAL' | 'PERSONAL' | 'INSTITUCIONAL' | 'FERIADO';
  usuario_id: string;
  inicio_at: Date;
  fin_at: Date | null;
  dia_completo: boolean;
  recordatorio_minutos: number | null;
  lugar: string | null;
  created_at: Date;
  decanato_ids: number[];
}

function mapRow(row: EventoRow, participo = false): Evento {
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
    lugar: row.lugar,
    createdAt: row.created_at,
    decanatoIds: row.decanato_ids ?? [],
    participo,
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
      tipo: 'OFICIAL' | 'PERSONAL' | 'INSTITUCIONAL' | 'FERIADO';
      usuarioId: string;
      inicioAt: string;
      finAt: string | null;
      diaCompleto: boolean;
      recordatorioMinutos: number | null;
      lugar: string | null;
    },
  ): Promise<Evento> {
    const result = await tx.query<{ id: string }>(
      `INSERT INTO eventos (titulo, descripcion, tipo, usuario_id, inicio_at, fin_at, dia_completo, recordatorio_minutos, lugar)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
        input.lugar,
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
    filtro: {
      desde: Date;
      hasta: Date;
      limit: number;
      offset: number;
      usuarioId: string;
      incluirOficiales: 'todos' | 'agregados';
      /** Recorte por naturaleza (consola de gestión). */
      tipo?: TipoEvento;
      /** Búsqueda textual título O lugar (consola de gestión). */
      q?: string;
    },
  ): Promise<Evento[]> {
    const { whereSql, params } = this.construirWhere(filtro);
    params.push(filtro.limit, filtro.offset);

    const rows = await tx.query<EventoRow>(
      `${BASE_SELECT}
        ${whereSql}
        GROUP BY e.id
        ORDER BY e.inicio_at ASC
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return this.decorarParticipaciones(tx, filtro.usuarioId, rows.rows);
  }

  async contar(
    tx: DbTx,
    filtro: {
      desde: Date;
      hasta: Date;
      usuarioId: string;
      incluirOficiales: 'todos' | 'agregados';
      /** Recorte por naturaleza (consola de gestión). */
      tipo?: TipoEvento;
      /** Búsqueda textual título O lugar (consola de gestión). */
      q?: string;
    },
  ): Promise<number> {
    const { whereSql, params } = this.construirWhere(filtro);
    // Sin LEFT JOIN de audiencias (el WHERE no lo usa) ni LIMIT: el total
    // del rango completo. RLS recorta con las mismas claims que listar.
    const result = await tx.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM eventos e ${whereSql}`,
      params,
    );
    return result.rows[0]?.n ?? 0;
  }

  private construirWhere(
    filtro: {
      desde: Date;
      hasta: Date;
      usuarioId: string;
      incluirOficiales: 'todos' | 'agregados';
      tipo?: TipoEvento;
      q?: string;
    },
  ): { whereSql: string; params: (Date | string | number)[] } {
    const params: (Date | string | number)[] = [filtro.desde, filtro.hasta];
    const where: string[] = ['e.inicio_at >= $1', 'e.inicio_at <= $2'];

    // Agenda opt-in: los OFICIALES solo entran si el usuario los agregó
    // (`evento_participantes`); PERSONAL, INSTITUCIONAL y FERIADO siguen
    // entrando según los deje RLS.
    if (filtro.incluirOficiales === 'agregados') {
      params.push(filtro.usuarioId);
      where.push(
        `(
          e.tipo <> 'OFICIAL'
          OR EXISTS (
            SELECT 1 FROM evento_participantes ep
            WHERE ep.evento_id = e.id AND ep.usuario_id = $${params.length}
          )
        )`,
      );
    }

    // Filtros del staff (consola de gestión): recorte por naturaleza y
    // búsqueda título O lugar. Con el FILTER de array_agg intacto, el
    // GROUP BY e.id tolera el extra sin inflar filas.
    if (filtro.tipo) {
      params.push(filtro.tipo);
      where.push(`e.tipo = $${params.length}`);
    }
    if (filtro.q) {
      params.push(`%${filtro.q}%`);
      const marcador = `$${params.length}`;
      where.push(`(e.titulo ILIKE ${marcador} OR e.lugar ILIKE ${marcador})`);
    }

    return { whereSql: `WHERE ${where.join(' AND ')}`, params };
  }

  async participar(tx: DbTx, eventoId: string, usuarioId: string): Promise<void> {
    await tx.query(
      `INSERT INTO evento_participantes (evento_id, usuario_id)
       VALUES ($1, $2)
       ON CONFLICT (evento_id, usuario_id) DO NOTHING`,
      [eventoId, usuarioId],
    );
  }

  async abandonar(tx: DbTx, eventoId: string, usuarioId: string): Promise<void> {
    await tx.query(
      'DELETE FROM evento_participantes WHERE evento_id = $1 AND usuario_id = $2',
      [eventoId, usuarioId],
    );
  }

  async participacionIds(tx: DbTx, usuarioId: string, eventoIds: string[]): Promise<string[]> {
    if (eventoIds.length === 0) return [];
    const r = await tx.query<{ evento_id: string }>(
      'SELECT evento_id FROM evento_participantes WHERE usuario_id = $1 AND evento_id = ANY($2::uuid[])',
      [usuarioId, eventoIds],
    );
    return r.rows.map((row) => row.evento_id);
  }

  /** Conteo de la agenda (`evento_participantes`) de un evento. Stats de staff. */
  async contarParticipantes(tx: DbTx, eventoId: string): Promise<number> {
    const r = await tx.query<{ total: string }>(
      'SELECT count(*)::text AS total FROM evento_participantes WHERE evento_id = $1',
      [eventoId],
    );
    return Number(r.rows[0]?.total ?? 0);
  }

  /** Decora rows de eventos con `participo` (una sola consulta extra). */
  private async decorarParticipaciones(
    tx: DbTx,
    usuarioId: string,
    rows: EventoRow[],
  ): Promise<Evento[]> {
    const eventos = rows.map((row) => mapRow(row, false));
    const ids = new Set(eventos.map((e) => e.id));
    const participantes = await this.participacionIds(tx, usuarioId, [...ids]);
    const set = new Set(participantes);
    for (const evento of eventos) {
      evento.participo = set.has(evento.id);
    }
    return eventos;
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
      lugar?: string | null;
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
    if (input.lugar !== undefined) {
      sets.push(`lugar = $${sets.length + 1}`);
      values.push(input.lugar);
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
    return result.rows.map((row) => mapRow(row, false));
  }

  async destinatariosDeEvento(tx: DbTx, evento: Evento): Promise<string[]> {
    if (evento.tipo === 'PERSONAL') {
      return [evento.usuarioId];
    }
    // OFICIAL: solo participantes de `evento_participantes` (agenda opt-in);
    // la notificación de "nuevo evento oficial" la maneja el fan-out de
    // EVENTO_OFICIAL_CREADO.
    if (evento.tipo === 'OFICIAL') {
      const r = await tx.query<{ usuario_id: string }>(
        'SELECT usuario_id FROM evento_participantes WHERE evento_id = $1',
        [evento.id],
      );
      return r.rows.map((row) => row.usuario_id);
    }
    // INSTITUCIONAL/FERIADO: audiencia GLOBAL = todos los usuarios;
    // específica = usuarios de esos decanatos. Excluye al creador (patrón
    // preexistente para no duplicar notificaciones con el fan-out inicial).
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
