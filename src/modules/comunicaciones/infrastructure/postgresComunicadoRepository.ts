import type { DbTx } from '../../../shared/kernel/db';
import { FiltroListadoComunicados } from '../domain/ports';
import type { IComunicadoRepository } from '../domain/ports';
import type { Comunicado, Estado } from '../domain/comunicado';
import { ESTADOS } from '../domain/comunicado';

interface ComunicadoRow {
  id: string;
  titulo: string;
  cuerpo: string;
  autor_id: string;
  autor_nombre: string;
  estado: Estado;
  aprobado_por: string | null;
  motivo_rechazo: string | null;
  publicado_at: Date | null;
  programado_para: Date | null;
  expira_at: Date | null;
  imagen_path: string | null;
  imagen_pie: string | null;
  categoria: string | null;
  created_at: Date;
  updated_at: Date;
  decanato_ids: number[];
  lecturas_count?: number;
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
    // ?? null: tolera DB sin migrar (columnas nuevas ausentes en c.*) —
    // undefined rompería el gate `!== null` del cliente y las puertas lógicas.
    imagenPath: row.imagen_path ?? null,
    imagenPie: row.imagen_pie ?? null,
    categoria: (row.categoria as Comunicado['categoria']) ?? null,
    autorNombre: row.autor_nombre,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    decanatoIds: row.decanato_ids ?? [],
    // ?? 0: tolera DB sin la subquery (o comunicado_lecturas vacía).
    lecturasCount: row.lecturas_count ?? 0,
  };
}

// `autor_nombre` viene de una subquery escalar contra `usuarios`
// (tabla del módulo Identidad — misma DB, JOIN de lectura puro: sin cruce
// de código entre módulos). Subquery en vez de JOIN para notene tocar el
// GROUP BY c.id (el JOIN forzaría agrupar por u.nombre: error 42803).
// `lecturas_count` igual: subquery escalar sobre `comunicado_lecturas`,
// cuyo RLS ya recorta qué filas ve cada rol (autor/ADMIN/lector).
const BASE_SELECT = `
  SELECT
    c.*,
    (SELECT u.nombre FROM usuarios u WHERE u.id = c.autor_id) AS autor_nombre,
    (SELECT count(*)::int FROM comunicado_lecturas l WHERE l.comunicado_id = c.id) AS lecturas_count,
    COALESCE(array_agg(ca.decanato_id) FILTER (WHERE ca.decanato_id IS NOT NULL), '{}') AS decanato_ids
  FROM comunicados c
  LEFT JOIN comunicado_audiencias ca ON ca.comunicado_id = c.id
`;

// Filtro del repositorio = el del puerto (documentado en domain/ports.ts).
type FiltroComunicados = FiltroListadoComunicados;

/**
 * Constructor de WHERE compartido entre `listar` y `contar`: el total y los
 * items se calculan con exactamente el mismo filtro, así la paginación
 * nunca desincroniza. Referencias solo a `c.*` (sin JOIN de audiencias),
 * lo que permite que `contar` no necesite el LEFT JOIN.
 */
function construirWhere(filtro: FiltroComunicados): {
  whereSql: string;
  params: (string | number)[];
} {
  const params: (string | number)[] = [];
  const where: string[] = [];

  if (filtro.estado) {
    params.push(filtro.estado);
    where.push(`c.estado = $${params.length}`);
  }
  if (filtro.categoria) {
    params.push(filtro.categoria);
    where.push(`c.categoria = $${params.length}`);
  }
  if (filtro.q) {
    params.push(`%${filtro.q}%`);
    where.push(`(c.titulo ILIKE $${params.length} OR c.cuerpo ILIKE $${params.length})`);
  }
  if (filtro.decanatoId !== undefined) {
    params.push(filtro.decanatoId);
    where.push(
      // El GLOBAL (sin filas de audiencia) también alcanza al decanato:
      // "comunicados cuyo alcance incluye el decanato N".
      `(NOT EXISTS (
         SELECT 1 FROM comunicado_audiencias cag
         WHERE cag.comunicado_id = c.id
       )
       OR EXISTS (
         SELECT 1 FROM comunicado_audiencias cad
         WHERE cad.comunicado_id = c.id AND cad.decanato_id = $${params.length}
       ))`,
    );
  }

  return { whereSql: where.length > 0 ? `WHERE ${where.join(' AND ')}` : '', params };
}

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
      categoria: string | null;
    },
  ): Promise<Comunicado> {
    const insert = await tx.query<{ id: string }>(
      `INSERT INTO comunicados (titulo, cuerpo, autor_id, programado_para, expira_at, categoria)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [input.titulo, input.cuerpo, input.autorId, input.programadoPara, input.expiraAt, input.categoria],
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
    filtro: FiltroComunicados & {
      limit: number;
      offset: number;
    },
  ): Promise<Comunicado[]> {
    const { whereSql, params } = construirWhere(filtro);
    params.push(filtro.limit, filtro.offset);

    const result = await tx.query<ComunicadoRow>(
      `${BASE_SELECT} ${whereSql} GROUP BY c.id ORDER BY c.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return result.rows.map(mapRow);
  }

  async contar(tx: DbTx, filtro: FiltroComunicados): Promise<number> {
    const { whereSql, params } = construirWhere(filtro);
    // Sin LEFT JOIN de audiencias (el WHERE no lo usa): un JOIN agrupado
    // inflaría filas sin COUNT(DISTINCT). RLS recorta el count con las
    // mismas claims que el listado (misma tx del UnitOfWork).
    const result = await tx.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM comunicados c ${whereSql}`,
      params,
    );
    return result.rows[0]?.n ?? 0;
  }

  async contarPorEstado(tx: DbTx): Promise<Record<Estado, number>> {
    const conteos = Object.fromEntries(ESTADOS.map((e) => [e, 0])) as Record<Estado, number>;
    const result = await tx.query<{ estado: Estado; n: number }>(
      'SELECT estado, count(*)::int AS n FROM comunicados GROUP BY estado',
    );
    for (const row of result.rows) {
      conteos[row.estado] = row.n;
    }
    return conteos;
  }

  async actualizar(
    tx: DbTx,
    id: string,
    input: {
      titulo?: string;
      cuerpo?: string;
      programadoPara?: string | null;
      expiraAt?: string | null;
      categoria?: string | null;
      decanatoIds?: number[];
    },
  ): Promise<Comunicado | null> {
    const sets: string[] = [];
    const values: (string | Date | null)[] = [];

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
    if (input.categoria !== undefined) {
      sets.push(`categoria = $${sets.length + 1}`);
      values.push(input.categoria);
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
    // Best-effort: si el usuario del token ya no existe (sesión huérfana tras
    // un `db reset`), la FK de `usuario_id` fallaría y rompería la lectura del
    // comunicado con un 500. Sin fila no hay estadística, pero el detalle
    // sigue siendo legible.
    await tx.query(
      `INSERT INTO comunicado_lecturas (comunicado_id, usuario_id)
       SELECT $1, $2
       WHERE EXISTS (SELECT 1 FROM usuarios WHERE id = $2)
       ON CONFLICT DO NOTHING`,
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

  async contarLecturasTotales(tx: DbTx): Promise<number> {
    // La suma vive en un JOIN: RLS de `comunicados` acota a los visibles y
    // la de `comunicado_lecturas` a las lecturas legibles según el rol.
    const result = await tx.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM comunicado_lecturas l JOIN comunicados c ON c.id = l.comunicado_id',
    );
    return result.rows[0]?.n ?? 0;
  }

  async asignarPortada(
    tx: DbTx,
    id: string,
    imagenPath: string | null,
    imagenPie: string | null,
  ): Promise<Comunicado | null> {
    await tx.query(
      'UPDATE comunicados SET imagen_path = $1, imagen_pie = $2 WHERE id = $3',
      [imagenPath, imagenPie, id],
    );
    return this.buscarPorId(tx, id);
  }
}
