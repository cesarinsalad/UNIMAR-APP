import type { DbTx } from '../../../shared/kernel/db';
import type { Adjunto, CrearAdjuntoInput } from '../domain/adjunto';
import type { IAdjuntoRepository } from '../domain/ports';

interface AdjuntoRow {
  id: string;
  comunicado_id: string;
  storage_path: string;
  nombre: string;
  mime_type: string;
  created_at: Date;
}

function mapRow(row: AdjuntoRow): Adjunto {
  return {
    id: row.id,
    comunicadoId: row.comunicado_id,
    storagePath: row.storage_path,
    nombre: row.nombre,
    mimeType: row.mime_type,
    createdAt: row.created_at,
  };
}

/**
 * Implementación de IAdjuntoRepository sobre PostgreSQL.
 *
 * Solo persiste los METADATOS del adjunto (path, nombre, mime_type); el binario
 * vive en Supabase Storage y lo gestiona SupabaseStorageService. Como el resto
 * del módulo, recibe una `DbTx` para ejecutarse dentro del UnitOfWork con RLS.
 */
export class PostgresAdjuntoRepository implements IAdjuntoRepository {
  async crear(tx: DbTx, input: CrearAdjuntoInput): Promise<Adjunto> {
    const result = await tx.query<AdjuntoRow>(
      `INSERT INTO comunicado_adjuntos (comunicado_id, storage_path, nombre, mime_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.comunicadoId, input.storagePath, input.nombre, input.mimeType],
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error('No se pudo crear el adjunto');
    }
    return mapRow(row);
  }

  async listarPorComunicado(tx: DbTx, comunicadoId: string): Promise<Adjunto[]> {
    const result = await tx.query<AdjuntoRow>(
      `SELECT * FROM comunicado_adjuntos
       WHERE comunicado_id = $1
       ORDER BY created_at DESC`,
      [comunicadoId],
    );
    return result.rows.map(mapRow);
  }

  async buscarPorId(tx: DbTx, id: string): Promise<Adjunto | null> {
    const result = await tx.query<AdjuntoRow>(
      'SELECT * FROM comunicado_adjuntos WHERE id = $1',
      [id],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async eliminar(tx: DbTx, id: string): Promise<boolean> {
    const result = await tx.query<{ id: string }>(
      'DELETE FROM comunicado_adjuntos WHERE id = $1 RETURNING id',
      [id],
    );
    return result.rows.length > 0;
  }
}
