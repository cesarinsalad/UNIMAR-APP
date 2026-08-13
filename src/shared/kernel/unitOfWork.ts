import type { Pool } from 'pg';
import type { DbTx } from './db';

/**
 * Unit-of-work (Shared Kernel).
 *
 * Envuelve cada request del BFF en una transacción que inyecta los claims del
 * usuario autenticado vía set_config('request.jwt.claims', ...). Esto hace que
 * las políticas RLS de Supabase evalúen la identidad REAL del usuario
 * (ABAC en base de datos), incluso cuando el cliente nunca toca Postgres.
 *
 * Regla de disciplina: ningún repositorio consulta fuera de una transacción
 * proporcionada por esta clase.
 */
export class UnitOfWork {
  constructor(private readonly pool: Pool) {}

  /** Transacción sin claims (operaciones del sistema: login, jobs de servicio). */
  async run<T>(fn: (tx: DbTx) => Promise<T>): Promise<T> {
    return this.withTx(null, fn);
  }

  /** Transacción con claims del usuario autenticado (las políticas RLS aplican). */
  async runAs<T>(claims: Record<string, unknown>, fn: (tx: DbTx) => Promise<T>): Promise<T> {
    return this.withTx(claims, fn);
  }

  private async withTx<T>(
    claims: Record<string, unknown> | null,
    fn: (tx: DbTx) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      if (claims !== null) {
        await client.query('SELECT set_config($1, $2, true)', [
          'request.jwt.claims',
          JSON.stringify(claims),
        ]);
      }
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* conexión rota: no hay nada que hacer */
      }
      throw error;
    } finally {
      client.release();
    }
  }
}
