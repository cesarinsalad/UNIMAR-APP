/**
 * Historial acotado del editor. La librería nativa no expone undo/redo,
 * así que la sesión conserva snapshots de Markdown + selección. La lógica
 * es pura para probar agrupación, truncado de redo y límites sin RN.
 */

export interface SeleccionEditor {
  start: number;
  end: number;
}

export type TipoEntradaHistorial = 'inicial' | 'texto' | 'formato';

export interface EntradaHistorial {
  markdown: string;
  seleccion: SeleccionEditor;
  tipo: TipoEntradaHistorial;
  registradaEn: number;
}

export interface EstadoHistorial {
  entradas: EntradaHistorial[];
  indice: number;
  ultimoRegistroEn: number;
  tipoUltimo: TipoEntradaHistorial;
}

const VENTANA_AGRUPACION_MS = 700;
const MAX_ENTRADAS = 80;

export function crearHistorial(
  markdown: string,
  seleccion: SeleccionEditor = { start: 0, end: 0 },
  ahora = Date.now(),
): EstadoHistorial {
  return {
    entradas: [{ markdown, seleccion, tipo: 'inicial', registradaEn: ahora }],
    indice: 0,
    ultimoRegistroEn: ahora,
    tipoUltimo: 'inicial',
  };
}

/** Entrada visible actual; nunca deja de existir (el inicial es el piso). */
export function entradaActual(estado: EstadoHistorial): EntradaHistorial {
  return estado.entradas[estado.indice] ?? estado.entradas[0]!;
}

export function puedeDeshacer(estado: EstadoHistorial): boolean {
  return estado.indice > 0;
}

export function puedeRehacer(estado: EstadoHistorial): boolean {
  return estado.indice < estado.entradas.length - 1;
}

/**
 * Actualiza solo el caret de la entrada actual. Un cambio de selección no
 * modifica el documento: separarlo de `registrarEnHistorial` evita que el
 * valor de un render anterior (closure) se registre como Markdown vigente
 * cuando el evento nativo llega antes de que React re-renderice.
 */
export function registrarSeleccionEnHistorial(
  estado: EstadoHistorial,
  seleccion: SeleccionEditor,
): EstadoHistorial {
  const actual = entradaActual(estado);
  if (
    actual.seleccion.start === seleccion.start &&
    actual.seleccion.end === seleccion.end
  ) {
    return estado;
  }
  const entradas = estado.entradas.slice();
  entradas[estado.indice] = { ...actual, seleccion };
  return { ...estado, entradas };
}

/**
 * Registra un cambio. La escritura continua dentro de la ventana agrupa en
 * una sola entrada; un comando de formato (o una pausa) separa transacción.
 */
export function registrarEnHistorial(
  estado: EstadoHistorial,
  markdown: string,
  seleccion: SeleccionEditor,
  tipo: Exclude<TipoEntradaHistorial, 'inicial'> = 'texto',
  ahora = Date.now(),
): EstadoHistorial {
  const actual = entradaActual(estado);
  if (actual.markdown === markdown) {
    return registrarSeleccionEnHistorial(estado, seleccion);
  }

  const base = estado.entradas.slice(0, estado.indice + 1);
  const agrupar =
    tipo === 'texto' &&
    estado.tipoUltimo === 'texto' &&
    ahora - estado.ultimoRegistroEn <= VENTANA_AGRUPACION_MS &&
    base.length > 1;

  if (agrupar) {
    base[base.length - 1] = { markdown, seleccion, tipo, registradaEn: ahora };
  } else {
    base.push({ markdown, seleccion, tipo, registradaEn: ahora });
  }

  let entradas = base;
  let indice = base.length - 1;
  if (entradas.length > MAX_ENTRADAS) {
    const sobrantes = entradas.length - MAX_ENTRADAS;
    entradas = entradas.slice(sobrantes);
    indice -= sobrantes;
  }

  return {
    entradas,
    indice,
    ultimoRegistroEn: ahora,
    tipoUltimo: tipo,
  };
}

export interface MovimientoHistorial {
  estado: EstadoHistorial;
  entrada: EntradaHistorial;
}

export function deshacerHistorial(estado: EstadoHistorial): MovimientoHistorial | null {
  if (!puedeDeshacer(estado)) return null;
  const indice = estado.indice - 1;
  return {
    // Un salto nunca se agrupa con la escritura siguiente: el estado al que
    // se volvió debe seguir siendo recuperable por el próximo undo.
    estado: { ...estado, indice, ultimoRegistroEn: 0, tipoUltimo: 'formato' },
    entrada: estado.entradas[indice]!,
  };
}

export function rehacerHistorial(estado: EstadoHistorial): MovimientoHistorial | null {
  if (!puedeRehacer(estado)) return null;
  const indice = estado.indice + 1;
  return {
    estado: { ...estado, indice, ultimoRegistroEn: 0, tipoUltimo: 'formato' },
    entrada: estado.entradas[indice]!,
  };
}
