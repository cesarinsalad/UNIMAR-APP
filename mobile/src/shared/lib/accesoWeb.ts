import type { Rol } from '@/features/identidad/types';

/** Resultado de evaluar un acceso desde el navegador (web gate). */
export type ResultadoAccesoWeb = 'pasar' | 'irGestion' | 'bloquear';

/**
 * La web es la plataforma de staff: consola de Gestión + flujo editorial.
 * Resto del contenido (feed, clases, agenda, perfil) es experiencia de app
 * móvil. Reglas (en orden):
 * - `/login` siempre pasa (acceso para autenticar al staff; también arom:
 *   el estudiante puede autenticarse y la compuerta lo saca luego).
 * - Sin rol (sin sesión): pasa — el `(app)/_layout` ya redirige a login
 *   con su guard de token; la compuerta no duplica esa decisión.
 * - ESTUDIANTE autenticado en web: bloquear → pantalla "UNIMARapp es
 *   para tu teléfono" (no se muestra el feed/tabs desde el navegador).
 * - Staff (COMUNICADOR/ADMIN): la consola, su flujo editorial y la bandeja
 *   de notificaciones pasan; cualquier otra ruta (incluida `/`) → volver a
 *   la consola.
 */
/** Las rutas que el staff puede abrir en navegador: la consola de
 * Gestión (y sus deep-links ?seccion/?estado), el flujo editorial
 * (editores `nuevo` y detalles por uuid) y la bandeja de notificaciones.
 * El resto (feed, agenda, tabs, `mis`, académico) rebota a la consola. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function rutaPermitidaStaffWeb(pathname: string): boolean {
  if (pathname.startsWith('/gestion')) return true;
  if (pathname.startsWith('/notificaciones')) return true;
  if (pathname.startsWith('/comunicados/nuevo') || pathname.startsWith('/eventos/nuevo')) {
    return true;
  }
  const detalle = /^(\/comunicados|\/eventos)\/([^/]+)$/.exec(pathname);
  return Boolean(detalle && UUID.test(detalle[2] ?? ''));
}

export function evaluarAccesoWeb(pathname: string, rol: Rol | null): ResultadoAccesoWeb {
  // Login: la única puerta de entrada (staff se autentica aquí).
  if (pathname === '/login' || pathname.startsWith('/login')) return 'pasar';
  if (!rol) return 'pasar'; // sin sesión: el guard de token decide (→ /login)
  if (rol === 'ESTUDIANTE') return 'bloquear';
  return rutaPermitidaStaffWeb(pathname) ? 'pasar' : 'irGestion';
}
