import {
  aplicarPrefijo,
  envolver,
  type ResultadoAccion,
  type SeleccionEditor,
} from './editorCuerpo.acciones';
import type { ComandoEditor } from './comandosEditor';

function clamp(n: number, max: number): number {
  return Math.max(0, Math.min(n, max));
}

function limitesBloque(valor: string, seleccion: SeleccionEditor) {
  const a = clamp(seleccion.start, valor.length);
  const b = clamp(seleccion.end, valor.length);
  const inicio = valor.lastIndexOf('\n', Math.min(a, b) - 1) + 1;
  const salto = valor.indexOf('\n', Math.max(a, b));
  const fin = salto === -1 ? valor.length : salto;
  return { inicio, fin, bloque: valor.slice(inicio, fin) };
}

/**
 * Aplica un encabezado a las líneas tocadas. Si todas ya tienen ese mismo
 * nivel, lo retira (toggle); si tienen otro, lo sustituye.
 */
export function aplicarEncabezado(
  valor: string,
  seleccion: SeleccionEditor,
  nivel: 1 | 2 | 3,
): ResultadoAccion {
  const { inicio, fin, bloque } = limitesBloque(valor, seleccion);
  const prefijo = `${'#'.repeat(nivel)} `;
  const lineas = bloque.split('\n');
  const conTexto = lineas.filter((linea) => linea.trim().length > 0);
  const quitar = conTexto.length > 0 && conTexto.every((linea) => linea.startsWith(prefijo));

  const transformadas = lineas.map((linea) => {
    const sinEncabezado = linea.replace(/^#{1,6}\s+/, '');
    if (quitar || sinEncabezado.trim().length === 0) {
      return sinEncabezado;
    }
    return `${prefijo}${sinEncabezado}`;
  });

  const nuevo = transformadas.join('\n');
  const delta = nuevo.length - bloque.length;
  return {
    texto: `${valor.slice(0, inicio)}${nuevo}${valor.slice(fin)}`,
    inicio: fin + delta,
    fin: fin + delta,
  };
}

/** Sangría de tres espacios por nivel, solo sobre líneas con contenido. */
export function aplicarSangriaLista(
  valor: string,
  seleccion: SeleccionEditor,
  delta: 1 | -1,
): ResultadoAccion {
  const { inicio, fin, bloque } = limitesBloque(valor, seleccion);
  const lineas = bloque.split('\n');
  const transformadas = lineas.map((linea) => {
    if (linea.length === 0) return linea;
    if (delta === 1) return `   ${linea}`;
    return linea.startsWith('   ') ? linea.slice(3) : linea;
  });
  const nuevo = transformadas.join('\n');
  const variacion = nuevo.length - bloque.length;
  return {
    texto: `${valor.slice(0, inicio)}${nuevo}${valor.slice(fin)}`,
    inicio: fin + variacion,
    fin: fin + variacion,
  };
}

/** URL http(s) normalizada; null si el texto no es un destino válido. */
export function normalizarUrlEnlace(entrada: string): string | null {
  const limpia = entrada.trim();
  if (limpia.length === 0 || /\s/.test(limpia)) return null;
  const url = /^[a-z][a-z\d+.-]*:/i.test(limpia) ? limpia : `https://${limpia}`;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/**
 * Inserta un enlace sobre la selección. En modo Markdown conocemos el texto
 * seleccionado; en visual se usa `insertLink`/`setLink` del motor nativo.
 */
export function aplicarEnlaceMarkdown(
  valor: string,
  seleccion: SeleccionEditor,
  url: string,
  textoNuevo: string,
): ResultadoAccion {
  const a = clamp(seleccion.start, valor.length);
  const b = clamp(seleccion.end, valor.length);
  const inicio = Math.min(a, b);
  const fin = Math.max(a, b);
  const texto = (valor.slice(inicio, fin) || textoNuevo.trim() || 'enlace')
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/]/g, '\\]');
  // Paréntesis sin escapar cierran el destino del enlace antes de tiempo.
  const destino = url.replace(/\(/g, '%28').replace(/\)/g, '%29');
  const enlace = `[${texto}](${destino})`;
  return {
    texto: `${valor.slice(0, inicio)}${enlace}${valor.slice(fin)}`,
    inicio: inicio + enlace.length,
    fin: inicio + enlace.length,
  };
}

export function aplicarComandoMarkdown(
  valor: string,
  seleccion: SeleccionEditor,
  comando: Exclude<ComandoEditor, 'enlace' | 'alternarMarkdown'>,
): ResultadoAccion {
  switch (comando) {
    case 'negrita':
      return envolver(valor, seleccion, '**', '**', 'texto en negrita');
    case 'cursiva':
      return envolver(valor, seleccion, '*', '*', 'texto en cursiva');
    case 'tachado':
      return envolver(valor, seleccion, '~~', '~~', 'texto tachado');
    case 'h1':
      return aplicarEncabezado(valor, seleccion, 1);
    case 'h2':
      return aplicarEncabezado(valor, seleccion, 2);
    case 'h3':
      return aplicarEncabezado(valor, seleccion, 3);
    case 'vinetas':
      return aplicarPrefijo(valor, seleccion, '- ');
    case 'numerada':
      return aplicarPrefijo(valor, seleccion, '', true);
    case 'indentar':
      return aplicarSangriaLista(valor, seleccion, 1);
    case 'desindentar':
      return aplicarSangriaLista(valor, seleccion, -1);
  }
}
