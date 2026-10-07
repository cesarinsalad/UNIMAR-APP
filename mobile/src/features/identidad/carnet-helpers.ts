/**
 * Formateadores de datos del perfil y del carnet digital. Puros (sin React,
 * sin tipos del módulo académico): el router los consume con strings.
 */

/** "V-30.065.516" estilo es-VE; vacío/datos ausentes → '—'. */
export function formatoCedula(cedula: string): string {
  const digitos = cedula.replace(/\D/g, '');
  if (digitos.length === 0) return '—';
  return `V-${digitos.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

const ROMANOS: string[] = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/** Número → numeral romano (1–10); fuera de rango → el número crudo. */
export function aRomano(n: number): string {
  const romano = ROMANOS[n];
  return romano && romano.length > 0 ? romano : String(n);
}

const ETIQUETAS_ESTATUS: Record<string, string> = {
  ACTIVO: 'Estudiante Regular',
  INACTIVO: 'Estudiante Inactivo',
  GRADUADO: 'Graduado',
  EGRESADO: 'Egresado',
};

/** Etiqueta amable del estatus académico; statuses ajenos → crudo. */
export function etiquetaEstatus(estatus: string): string {
  return ETIQUETAS_ESTATUS[estatus] ?? estatus;
}

/**
 * Matriz 12×12 sintética, determinística por semilla (la cédula) — la usa
 * el SVG del carnet: cuadros negros estéticos, NO un código escaneable.
 */
export function matrizCarnet(semilla: string,lado = 12): boolean[][] {
  let hash = semilla.length > 0 ? 0 : 1;
  for (let i = 0; i < semilla.length; i += 1) {
    hash = (hash * 31 + semilla.charCodeAt(i)) >>> 0;
  }
  const celdas: boolean[][] = [];
  for (let fila = 0; fila < lado; fila += 1) {
    const linea: boolean[] = [];
    for (let col = 0; col < lado; col += 1) {
      hash = (hash * 1103515245 + 12345) >>> 0;
      linea.push((hash >>> 16) % 3 !== 0);
    }
    celdas.push(linea);
  }
  return celdas;
}
