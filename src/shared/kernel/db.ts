import type { PoolClient } from 'pg';

/**
 * Contrato de transacción de base de datos.
 *
 * Todos los repositorios reciben un `DbTx` (nunca el pool global): garantiza que
 * toda consulta ocurra dentro de la transacción que el UnitOfWork abrió con los
 * claims del usuario (necesarios para que RLS evalúe la identidad real).
 * Es un alias del PoolClient de pg, pero tipado como contrato del shared kernel
 * para que los puertos de dominio no dependan del driver de la base de datos.
 */
export type DbTx = PoolClient;
