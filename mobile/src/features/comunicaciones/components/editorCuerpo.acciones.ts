/**
 * Transformaciones Markdown puras del editor de comunicados.
 * Cada botón de la barra de acciones produce { texto, inicio, fin }:
 * inicio/fin es la selección (start === end → solo caret) que el TextInput
 * debe asumir tras el cambio. Puros para poder probarse sin RN.
 */

export interface SeleccionEditor {
  start: number;
  end: number;
}

export interface ResultadoAccion {
  texto: string;
  inicio: number;
  fin: number;
}

function clamp(n: number, max: number): number {
  return Math.max(0, Math.min(n, max));
}

/** Baña la selección con `pre`/`post`, o inserta el par con placeholder y deja el caret dentro. */
export function envolver(
  value: string,
  sel: SeleccionEditor,
  pre: string,
  post: string,
  placeholder: string,
): ResultadoAccion {
  const a = clamp(sel.start, value.length);
  const b = clamp(sel.end, value.length);
  const ini = Math.min(a, b);
  const fin = Math.max(a, b);
  const antes = value.slice(0, ini);
  const medio = value.slice(ini, fin);
  const despues = value.slice(fin);

  if (medio.length > 0) {
    return {
      texto: `${antes}${pre}${medio}${post}${despues}`,
      inicio: antes.length + pre.length,
      fin: antes.length + pre.length + medio.length,
    };
  }
  return {
    texto: `${antes}${pre}${placeholder}${post}${despues}`,
    inicio: antes.length + pre.length,
    fin: antes.length + pre.length + placeholder.length,
  };
}

/**
 * Enlace Markdown: la selección se vuelve `[texto](url)` con `url`
 * seleccionado para escribirla encima; sin selección inserta
 * `[texto](url)` con `texto` seleccionado.
 */
export function envolverEnlace(value: string, sel: SeleccionEditor): ResultadoAccion {
  const a = clamp(sel.start, value.length);
  const b = clamp(sel.end, value.length);
  const ini = Math.min(a, b);
  const fin = Math.max(a, b);
  const antes = value.slice(0, ini);
  const medio = value.slice(ini, fin);
  const despues = value.slice(fin);

  if (medio.length > 0) {
    const posUrl = antes.length + 1 + medio.length + 2; // '[' + texto + ']('
    return {
      texto: `${antes}[${medio}](url)${despues}`,
      inicio: posUrl,
      fin: posUrl + 3,
    };
  }
  return {
    texto: `${antes}[texto](url)${despues}`,
    inicio: antes.length + 1,
    fin: antes.length + 1 + 5,
  };
}

/**
 * Aplica (o retira, si todas las líneas tocadas ya lo llevan) un prefijo
 * de línea (`## `, `> `, `- `) o lista numerada (`1. `…) a cada línea
 * que la selección toca. El caret queda al final del bloque transformado.
 */
export function aplicarPrefijo(
  value: string,
  sel: SeleccionEditor,
  prefijo: string,
  numerado = false,
): ResultadoAccion {
  const regexNumerada = /^\d+\. /;

  const a = clamp(sel.start, value.length);
  const b = clamp(sel.end, value.length);
  const ini = Math.min(a, b);
  const fin = Math.max(a, b);

  const inicioLinea = value.lastIndexOf('\n', ini - 1) + 1;
  // El bloque es desde el inicio de la primera línea tocada hasta su \n
  // (un caret a mitad de línea sigue formateando la LÍNEA completa).
  const idxSalto = value.indexOf('\n', fin);
  const finBloque = idxSalto === -1 ? value.length : idxSalto;

  const bloque = value.slice(inicioLinea, finBloque);
  const lineas = bloque.split('\n');

  const lineasConTexto = lineas.filter((linea) => linea.length > 0);
  const quitar = numerado
    ? lineasConTexto.length > 0 && lineasConTexto.every((linea) => regexNumerada.test(linea))
    :
      lineasConTexto.length > 0 && lineasConTexto.every((linea) => linea.startsWith(prefijo));

  let contador = 0;
  const transformadas = lineas.map((linea) => {
    if (quitar) {
      const corte = numerado
        ? (regexNumerada.exec(linea)?.[0] ?? null)
        : linea.startsWith(prefijo)
          ? prefijo
          : null;
      return corte !== null && linea.startsWith(corte) ? linea.slice(corte.length) : linea;
    }
    if (linea.length === 0) return linea;
    contador += 1;
    return `${numerado ? `${contador}. ` : prefijo}${linea}`;
  });

  const nuevoBloque = transformadas.join('\n');
  const delta = nuevoBloque.length - bloque.length;

  return {
    texto: `${value.slice(0, inicioLinea)}${nuevoBloque}${value.slice(finBloque)}`,
    inicio: finBloque + delta,
    fin: finBloque + delta,
  };
}
