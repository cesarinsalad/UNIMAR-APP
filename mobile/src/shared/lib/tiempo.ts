/**
 * Helpers de tiempo y lectura (pure, testeable). El formateo relativo es
 * manual (sin Intl.RelativeTimeFormat) porque Hermes no lo garantiza en
 * todos los runtimes, y un nivel de módulo `new Intl.RelativeTimeFormat`
 * explota al importar. Texto determinista: mismos textos en device/web/jest.
 */

const UNIDADES = {
  minute: { singular: 'un minuto', plural: 'minutos' },
  hour: { singular: 'una hora', plural: 'horas' },
  day: { singular: 'un día', plural: 'días' },
} as const;

type Unidad = keyof typeof UNIDADES;

/** "hace 5 minutos" | "hace una hora" | "en 2 días" … */
function formatoRelativo(cantidad: number, unidad: Unidad, pasado: boolean): string {
  const valor = cantidad === 1 ? UNIDADES[unidad].singular : `${cantidad} ${UNIDADES[unidad].plural}`;
  return pasado ? `hace ${valor}` : `en ${valor}`;
}

export function haceRelativo(iso: string, ahora: Date = new Date()): string {
  const fecha = new Date(iso);
  const difMs = fecha.getTime() - ahora.getTime();
  const pasado = difMs < 0;
  const abs = Math.abs(difMs);

  if (abs < 60_000) return 'Ahora mismo';

  const minutos = Math.round(abs / 60_000);
  const horas = Math.round(abs / 3_600_000);
  if (horas >= 24) {
    return formatoRelativo(Math.round(abs / 86_400_000), 'day', pasado);
  }
  if (minutos < 60) return formatoRelativo(minutos, 'minute', pasado);
  return formatoRelativo(horas, 'hour', pasado);
}

export function minutosLectura(texto: string): number {
  const palabras = texto.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(palabras / 200));
}
