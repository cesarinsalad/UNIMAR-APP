import type { DbTx } from '../../../shared/kernel/db';
import type {
  ICedulaResolver,
  IUsuarioIdResolver,
} from '../../../shared/kernel/cedulaResolver';
import type { Decanato } from './decanato';

export interface CredencialesUniversitarias {
  email: string;
  password: string;
}

/** Perfil devuelto por la universidad tras validar credenciales. */
export interface PerfilUniversitario {
  /** Cédula del usuario. Llave de mapeo con usuarios.cedula. */
  cedula: string;
  nombre: string;
  /** FK a la tabla decanatos. null cuando el usuario no pertenece a un decanato (ej. ADMIN). */
  decanatoId: number | null;
  email?: string | null;
}

/**
 * Puerto de dominio: contrato de autenticación contra la API de la universidad.
 * Implementaciones: MockUniversityAuthService (ahora) y ApiUniversityAuthService
 * (cuando UNIMAR entregue los endpoints) — swap por inyección de dependencias (DIP).
 */
export interface IUniversityAuthService {
  validateCredentials(credenciales: CredencialesUniversitarias): Promise<PerfilUniversitario>;
}

export interface Usuario {
  id: string;
  cedula: string;
  nombre: string;
  rolNombre: string;
  decanatoId: number | null;
  preferencias: Record<string, unknown>;
}

/**
 * Extiende dos puertos del shared kernel:
 *  - `ICedulaResolver`: UUID interno → cédula institucional.
 *  - `IUsuarioIdResolver`: cédula → UUID interno.
 *
 * Cualquier consumidor que necesite alguno de los dos mapeos puede
 * recibir un `IUsuarioRepository` directamente. El módulo Académico
 * (Paso 5) lo aprovecha para evitar hacer `tx.query` directamente,
 * manteniendo la encapsulación de la base de datos y la metodología DSBC.
 */
export interface IUsuarioRepository extends ICedulaResolver, IUsuarioIdResolver {
  /**
   * Crea el usuario si no existe (rol por defecto ESTUDIANTE) o actualiza sus
   * datos académicos. NUNCA sobrescribe el rol: la asignación de COMUNICADOR/ADMIN
   * la hace el sistema (seed/admin), no la API universitaria.
   */
  upsertDesdePerfil(tx: DbTx, perfil: PerfilUniversitario): Promise<Usuario>;
}

/**
 * Puerto del catálogo de decanatos (solo lectura). Alimenta los selectores
 * de audiencia del cliente móvil: COMUNICADOR usa su decanato fijo, ADMIN
 * elige GLOBAL ([]) o cualquier lista.
 */
export interface IDecanatoRepository {
  listar(tx: DbTx): Promise<Decanato[]>;
}
