import {
  aplicarPrefijo,
  envolver,
  envolverEnlace,
} from './editorCuerpo.acciones';

describe('envolver (negrita/cursiva)', () => {
  it('baña la selección existente', () => {
    const r = envolver('hola mundo', { start: 5, end: 10 }, '**', '**', 'x');
    expect(r.texto).toBe('hola **mundo**');
    expect(r.inicio).toBe(7);
    expect(r.fin).toBe(12);
  });

  it('inserta el par vacío y deja el caret dentro', () => {
    const r = envolver('hola ', { start: 5, end: 5 }, '**', '**', 'texto');
    expect(r.texto).toBe('hola **texto**');
    expect(r.inicio).toBe(7);
    expect(r.fin).toBe(12);
  });

  it('al invertir el orden de la selección sigue siendo válida', () => {
    const r = envolver('abc', { start: 3, end: 0 }, '_', '_', 'x');
    expect(r.texto).toBe('_abc_');
  });
});

describe('envolverEnlace', () => {
  it('con selección: `[texto](url)` con url seleccionado', () => {
    const r = envolverEnlace('mira esto', { start: 5, end: 9 });
    expect(r.texto).toBe('mira [esto](url)');
    expect(r.inicio).toBe(12);
    expect(r.fin).toBe(15);
  });

  it('sin selección: `[texto](url)` con texto seleccionado', () => {
    const r = envolverEnlace('abc ', { start: 4, end: 4 });
    expect(r.texto).toBe('abc [texto](url)');
    expect(r.inicio).toBe(5);
    expect(r.fin).toBe(10);
  });
});

describe('aplicarPrefijo', () => {
  it('aplica el prefijo a la línea actual del caret', () => {
    const r = aplicarPrefijo('linea 1\nlinea 2', { start: 10, end: 10 }, '- ');
    expect(r.texto).toBe('linea 1\n- linea 2');
    expect(r.inicio).toBe(r.fin);
  });

  it('aplica a varias líneas en orden (numeradas)', () => {
    const r = aplicarPrefijo(
      'uno\ndos\ntres',
      { start: 0, end: 12 },
      '',
      true,
    );
    expect(r.texto).toBe('1. uno\n2. dos\n3. tres');
  });

  it('retira el prefijo cuando todas las líneas absorbidas ya lo llevan (toggle)', () => {
    const con = aplicarPrefijo('a\nb', { start: 0, end: 3 }, '- ');
    expect(con.texto).toBe('- a\n- b');
    const sin = aplicarPrefijo('- a\n- b', { start: 0, end: 7 }, '- ');
    expect(sin.texto).toBe('a\nb');
  });

  it('no duplica lista en líneas vacías intermedias', () => {
    const r = aplicarPrefijo('a\n\nb', { start: 0, end: 4 }, '- ');
    expect(r.texto).toBe('- a\n\n- b');
  });

  it('retira numeración completa de listas', () => {
    const con = aplicarPrefijo('uno\ndos', { start: 0, end: 7 }, '', true);
    expect(con.texto).toBe('1. uno\n2. dos');
    const sin = aplicarPrefijo('1. uno\n2. dos', { start: 0, end: 13 }, '', true);
    expect(sin.texto).toBe('uno\ndos');
  });

  it('respeta los límites del value', () => {
    const r = aplicarPrefijo('corta', { start: 99, end: 99 }, '> ');
    expect(r.texto).toBe('> corta');
  });
});
