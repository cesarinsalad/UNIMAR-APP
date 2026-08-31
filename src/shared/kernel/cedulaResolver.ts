/**
 * Puerto compartido del shared kernel para resolver identificadores entre
 * el UUID interno y la cédula institucional.
 *
 * El módulo Académico necesita ambos mapeos para hablar con la API de
 * UNIMAR (que trabaja con cédulas) y con el sistema de notificaciones
 * (que trabaja con `usuarioId`). Para evitar que Académico haga
 * `tx.query` directo (lo que rompería la encapsulación y la metodología
 * DSBC), se definen estos contratos en el shared kernel. El módulo de
 * Identidad los implementa a través de su `IUsuarioRepository` por
 * herencia de interfaz, y el composition root (`server.ts`) inyecta la
 * misma instancia en los módulos que los necesiten.
 */
import type { DbTx } from './db';

export interface ICedulaResolver {
  /**
   * Devuelve la cédula del usuario identificado por `usuarioId`.
   * Lanza `NotFoundError` si el usuario no existe.
   */
  obtenerCedula(tx: DbTx, usuarioId: string): Promise<string>;
}

export interface IUsuarioIdResolver {
  /**
   * Devuelve el UUID interno (`usuarios.id`) del usuario identificado por
   * su cédula institucional. Lanza `NotFoundError` si no existe.
   */
  obtenerUsuarioIdPorCedula(tx: DbTx, cedula: string): Promise<string>;
}
