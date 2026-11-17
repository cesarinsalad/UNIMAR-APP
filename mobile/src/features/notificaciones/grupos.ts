import type { Notificacion } from './types';

/**
 * Agrupación cronológica de la bandeja por día natural LOCAL.
 *
 * La bandeja es un registro de novedades: el día es el eje (Hoy / Ayer /
 * fecha), y dentro de cada día basta la hora. Se agrupa con los getters
 * locales — no con el prefijo UTC del ISO — porque el usuario lee en su
 * hora, y una notificación de las 21:30 en Caracas pertenece a ese día
 * aunque en UTC ya sea el siguiente.
 *
 * Funciones puras e inyectables (`ahora`) para poder testearlas sin reloj.
 */

const FORMATO_DIA_CORTO = new Intl.DateTimeFormat('es-VE', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

const FORMATO_DIA_CON_ANIO = new Intl.DateTimeFormat('es-VE', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const FORMATO_HORA = new Intl.DateTimeFormat('es-VE', { timeStyle: 'short' });

export interface GrupoDia {
  /** Identidad estable del grupo: YYYY-MM-DD local (o 'sin-fecha'). */
  clave: string;
  /** "Hoy" · "Ayer" · "Jue 12 nov" · "12 nov 2025" */
  etiqueta: string;
  notificaciones: Notificacion[];
}

/** Clave de día local (YYYY-MM-DD), sin pasar por UTC. */
export function claveDia(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function fechaValida(iso: string): Date | null {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "Hoy", "Ayer" o la fecha corta es-VE ("Jue 12 nov" / "12 nov 2025"). */
export function etiquetaDia(fecha: Date, ahora: Date = new Date()): string {
  const clave = claveDia(fecha);
  if (clave === claveDia(ahora)) return 'Hoy';

  const ayer = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 1);
  if (clave === claveDia(ayer)) return 'Ayer';

  const formato =
    fecha.getFullYear() === ahora.getFullYear()
      ? FORMATO_DIA_CORTO
      : FORMATO_DIA_CON_ANIO;
  // Intl intercala comas y puntos ("jue, 12 nov."); la etiqueta va limpia
  // porque el chip la muestra en mayúsculas con tracking.
  const texto = formato
    .format(fecha)
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return capitalizar(texto);
}

/** Hora local de la notificación ("10:06 p. m."); vacío si el ISO es inválido. */
export function horaNotificacion(iso: string): string {
  const fecha = fechaValida(iso);
  return fecha ? FORMATO_HORA.format(fecha) : '';
}

/**
 * Agrupa preservando el orden de entrada (el wire ya llega de más nueva a
 * más vieja): cada día aparece una sola vez, en el orden de su primera
 * notificación. Los ISO inválidos caen a un grupo de cierre "Sin fecha"
 * en lugar de romper la lista.
 */
export function agruparPorDia(
  notificaciones: readonly Notificacion[],
  ahora: Date = new Date(),
): GrupoDia[] {
  const grupos: GrupoDia[] = [];
  const porClave = new Map<string, GrupoDia>();

  for (const notificacion of notificaciones) {
    const fecha = fechaValida(notificacion.createdAt);
    const clave = fecha ? claveDia(fecha) : 'sin-fecha';

    let grupo = porClave.get(clave);
    if (!grupo) {
      grupo = {
        clave,
        etiqueta: fecha ? etiquetaDia(fecha, ahora) : 'Sin fecha',
        notificaciones: [],
      };
      porClave.set(clave, grupo);
      grupos.push(grupo);
    }
    grupo.notificaciones.push(notificacion);
  }

  return grupos;
}
