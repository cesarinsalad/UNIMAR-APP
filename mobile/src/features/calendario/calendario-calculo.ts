/**
 * Cálculo de calendario puro para el grid mensual de la agenda.
 *
 * Cero dependencias de React/Expo: todo es (year, month, eventos) → valores.
 * La semana inicia en LUNES (decisión de UX del Paso 4; convención es-VE).
 * El parámetro `hoy` es inyectable para testear sin fusionar con Date.now.
 */

export interface VentanaMes {
  /** Inicio del mes 00:00 local (ISO). */
  desde: string;
  /** Último ms del último día del mes (ISO). */
  hasta: string;
  etiqueta: string;
  /** Clave estable para la query key p.ej. '2026-09'. */
  clave: string;
}

export interface CeldaDia {
  /** Clave local del día: 'yyyy-mm-dd'. */
  clave: string;
  dia: number;
  delMes: boolean;
  esHoy: boolean;
}

export interface MatrizMes {
  semanas: CeldaDia[][];
  /** Claves con al menos un evento (para los puntos del grid). */
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Clave local de un Date: yyyy-mm-dd (comparación por calendario, no ms). */
export function claveDia(fecha: Date): string {
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
}

/** Clave local 'yyyy-mm-dd' → Date a medianoche local. */
export function desdeClave(clave: string): Date {
  const partes = clave.split('-').map(Number);
  return new Date(partes[0] ?? 2026, (partes[1] ?? 1) - 1, partes[2] ?? 1);
}

export function ventanaMes(year: number, mesLocal: number): VentanaMes {
  const desde = new Date(year, mesLocal, 1);
  const hasta = new Date(year, mesLocal + 1, 0, 23, 59, 59, 999);
  const etiqueta = new Date(year, mesLocal, 1)
    .toLocaleDateString('es-VE', { month: 'long', year: 'numeric' });
  return {
    desde: desde.toISOString(),
    hasta: hasta.toISOString(),
    etiqueta: etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1),
    clave: `${year}-${pad(mesLocal + 1)}`,
  };
}

/** Mes anterior (devuelve [year, mesLocal] normalizados). */
export function mesAnterior(year: number, mesLocal: number): [number, number] {
  return mesLocal === 0 ? [year - 1, 11] : [year, mesLocal - 1];
}

export function mesSiguiente(year: number, mesLocal: number): [number, number] {
  return mesLocal === 11 ? [year + 1, 0] : [year, mesLocal + 1];
}

/**
 * Matriz del mes: 6 semanas × 7 días, LUNES PRIMERO. Las celdas antes y
 * después del mes se rellenan (delMes=false) para que el grid quede
 * siempre rectangular.
 */
export function matrizMes(year: number, mesLocal: number, hoy: Date = new Date()): CeldaDia[][] {
  const primerDia = new Date(year, mesLocal, 1);
  // getDay(): 0=domingo..6=sábado → lunes-first offset: (getDay()+6)%7
  const offsetLunes = (primerDia.getDay() + 6) % 7;

  const claveHoy = claveDia(hoy);
  const semanas: CeldaDia[][] = [];
  for (let semana = 0; semana < 6; semana++) {
    const fila: CeldaDia[] = [];
    for (let dia = 0; dia < 7; dia++) {
      const fecha = new Date(year, mesLocal, 1 - offsetLunes + semana * 7 + dia);
      fila.push({
        clave: claveDia(fecha),
        dia: fecha.getDate(),
        delMes: fecha.getMonth() === mesLocal,
        esHoy: claveDia(fecha) === claveHoy,
      });
    }
    semanas.push(fila);
  }
  return semanas;
}

export interface GrupoDia {
  clave: string;
  eventos: Array<{ id: string; titulo: string; tipo: 'OFICIAL' | 'PERSONAL'; inicioAt: string; diaCompleto: boolean; decanatoIds: number[] }>;
}

/**
 * Agrupa eventos por día (clave local) en orden cronológico — feed de la
 * agenda tras el GridMes. Solo necesita los campos que renderizan las cards.
 */
export function agruparPorDia(
  eventos: Array<{
    id: string;
    titulo: string;
    tipo: 'OFICIAL' | 'PERSONAL';
    inicioAt: string;
    diaCompleto: boolean;
    decanatoIds: number[];
  }>,
): GrupoDia[] {
  const mapa = new Map<string, GrupoDia>();
  for (const evento of [...eventos].sort(
    (a, b) => new Date(a.inicioAt).getTime() - new Date(b.inicioAt).getTime(),
  )) {
    const clave = claveDia(new Date(evento.inicioAt));
    const grupo = mapa.get(clave) ?? { clave, eventos: [] };
    grupo.eventos.push(evento);
    mapa.set(clave, grupo);
  }
  return [...mapa.values()].sort((a, b) => a.clave.localeCompare(b.clave));
}

function parseClave(clave: string): Date | null {
  const partes = clave.split('-').map(Number);
  const y = partes[0];
  const m = partes[1];
  const d = partes[2];
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/**
 * Título del encabezado del día: Hoy / Mañana / fecha larga es-VE
 * ("sábado 19 de septiembre de 2026"), inyectable `hoy` para test.
 */
export function tituloDia(clave: string, hoy: Date = new Date()): string {
  if (clave === claveDia(hoy)) return 'Hoy';
  const manana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
  if (clave === claveDia(manana)) return 'Mañana';
  const fecha = parseClave(clave);
  if (!fecha) return clave;
  return fecha.toLocaleDateString('es-VE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}