/**
 * Conversión pura entre `Date` local y los ISO parciales del selector web
 * de fecha/hora (`<input type="date">` → 'YYYY-MM-DD', `<input type="time">`
 * → 'HH:MM'). Todo en tiempo LOCAL: el wire del BFF espera ISO completo,
 * que el formulario genera con toISOString después de elegir.
 *
 * Los parses RECHAZAN valores inválidos (p. ej. '02-30' o '25:00'): los
 * objetos `Date` "rullan" entradas forzadas (setMonth(13) avanza el año),
 * así que cada parse verifica que la fecha resultante conserve
 * exactamente lo elegido; en caso contrario devuelve null y la UI ignora
 * el cambio.
 */

function dosDigitos(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Fecha local en formato ISO de `<input type="date">`: 'YYYY-MM-DD'. */
export function aIsoFecha(fecha: Date): string {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

/** Hora local en formato ISO de `<input type="time">`: 'HH:MM'. */
export function aIsoHora(fecha: Date): string {
  return `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
}

/**
 * Reemplaza el DÍA de `base` por el del ISO ('YYYY-MM-DD'), conservando
 * su hora/minuto/segundo. Invalid (día inexistente, partes no numéricas)
 * → null.
 */
export function fechaDesdeIso(base: Date, iso: string): Date | null {
  const partes = iso.split('-');
  if (partes.length !== 3) return null;
  const y = Number(partes[0]);
  const m = Number(partes[1]);
  const d = Number(partes[2]);
  if (!Number.isInteger(y) || y < 1000 || y > 9999) return null;
  if (!Number.isInteger(m) || m < 1 || m > 12) return null;
  if (!Number.isInteger(d) || d < 1 || d > 31) return null;
  const resultado = new Date(base.getTime());
  resultado.setFullYear(y, m - 1, d);
  if (resultado.getFullYear() !== y || resultado.getMonth() !== m - 1 || resultado.getDate() !== d) {
    return null;
  }
  return resultado;
}

/**
 * Reemplaza la HORA de `base` por la del ISO ('HH:MM'), conservando su
 * fecha. Invalid (fuera de rango, partes no numéricas) → null.
 */
export function horaDesdeIso(base: Date, iso: string): Date | null {
  const partes = iso.split(':');
  if (partes.length !== 2) return null;
  const h = Number(partes[0]);
  const min = Number(partes[1]);
  if (!Number.isInteger(h) || h < 0 || h > 23) return null;
  if (!Number.isInteger(min) || min < 0 || min > 59) return null;
  const resultado = new Date(base.getTime());
  resultado.setHours(h, min);
  if (resultado.getHours() !== h || resultado.getMinutes() !== min) return null;
  return resultado;
}
