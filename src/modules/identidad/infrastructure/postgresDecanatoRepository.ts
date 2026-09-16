import type { DbTx } from '../../../shared/kernel/db';
import type { Decanato } from '../domain/decanato';
import type { IDecanatoRepository } from '../domain/ports';

interface DecanatoRow {
  id: number;
  nombre: string;
}

/**
 * Implementación de IDecanatoRepository sobre PostgreSQL.
 *
 * La tabla `decanatos` es de sistema para app_bff (política
 * `decanatos_app_bff USING(true)`, migración identidad_base): legible bajo
 * claims sin mas querer nuevas políticas. Orden por id para que el catálogo
 * sea estable entre arranques del cliente.
 */
export class PostgresDecanatoRepository implements IDecanatoRepository {
  async listar(tx: DbTx): Promise<Decanato[]> {
    const result = await tx.query<DecanatoRow>(
      'SELECT id, nombre FROM decanatos ORDER BY id',
    );
    return result.rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
    }));
  }
}