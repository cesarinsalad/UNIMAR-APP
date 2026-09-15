/**
 * Cola de una sola ruta para deep-links de notificaciones tocadas con la app
 * cerrada (o antes de iniciar sesión).
 *
 * Semántica: get-and-clear. `tomarRutaPendiente` consume la ruta (la segunda
 * llamada devuelve null), lo que da protección natural contra doble consumo
 * entre el layout de (app) y el post-login.
 *
 * `limpiarRutaPendiente` la usa el logout: un deep-link del usuario saliente
 * no debe abrirle contenido al usuario que inicie sesión después.
 */
let pendiente: string | null = null;

export function guardarRutaPendiente(ruta: string): void {
  pendiente = ruta;
}

export function tomarRutaPendiente(): string | null {
  const ruta = pendiente;
  pendiente = null;
  return ruta;
}

export function limpiarRutaPendiente(): void {
  pendiente = null;
}