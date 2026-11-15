import {
  aplicarComandoMarkdown,
  aplicarEncabezado,
  aplicarEnlaceMarkdown,
  aplicarSangriaLista,
  normalizarUrlEnlace,
} from './editorMarkdown.acciones';

describe('aplicarEncabezado', () => {
  it('convierte el bloque y sustituye un nivel anterior', () => {
    const h2 = aplicarEncabezado('Texto', { start: 0, end: 0 }, 2);
    expect(h2.texto).toBe('## Texto');
    const h3 = aplicarEncabezado(h2.texto, { start: 0, end: 0 }, 3);
    expect(h3.texto).toBe('### Texto');
  });

  it('retira el mismo nivel al repetir el comando', () => {
    const r = aplicarEncabezado('## Texto', { start: 2, end: 2 }, 2);
    expect(r.texto).toBe('Texto');
  });

  it('aplica el encabezado a todas las líneas seleccionadas', () => {
    const r = aplicarEncabezado('Uno\nDos', { start: 0, end: 7 }, 1);
    expect(r.texto).toBe('# Uno\n# Dos');
  });
});

describe('aplicarSangriaLista', () => {
  it('añade y retira tres espacios por nivel', () => {
    const dentro = aplicarSangriaLista('- uno', { start: 0, end: 0 }, 1);
    expect(dentro.texto).toBe('   - uno');
    const fuera = aplicarSangriaLista(dentro.texto, { start: 0, end: 0 }, -1);
    expect(fuera.texto).toBe('- uno');
  });
});

describe('normalizarUrlEnlace', () => {
  it.each([
    ['unimar.edu.ve', 'https://unimar.edu.ve'],
    ['https://unimar.edu.ve/admisiones', 'https://unimar.edu.ve/admisiones'],
    ['http://localhost:3000', 'http://localhost:3000'],
  ])('%s → %s', (entrada, esperado) => {
    expect(normalizarUrlEnlace(entrada)).toBe(esperado);
  });

  it.each(['', '   ', 'javascript:alert(1)', 'no tiene espacios'])(
    'rechaza %s',
    (entrada) => {
      expect(normalizarUrlEnlace(entrada)).toBeNull();
    },
  );
});

describe('aplicarEnlaceMarkdown', () => {
  it('usa el texto seleccionado y deja el caret después del enlace', () => {
    const r = aplicarEnlaceMarkdown(
      'Mira esto',
      { start: 5, end: 9 },
      'https://unimar.edu.ve',
      '',
    );
    expect(r.texto).toBe('Mira [esto](https://unimar.edu.ve)');
    expect(r.inicio).toBe(r.texto.length);
  });

  it('sin selección usa el texto provisto', () => {
    const r = aplicarEnlaceMarkdown(
      'abc ',
      { start: 4, end: 4 },
      'https://unimar.edu.ve',
      'Admisiones',
    );
    expect(r.texto).toBe('abc [Admisiones](https://unimar.edu.ve)');
  });

  it('escapa corchetes del texto y paréntesis del destino', () => {
    const r = aplicarEnlaceMarkdown(
      'Mira [esto]',
      { start: 5, end: 11 },
      'https://es.wikipedia.org/wiki/UNIMAR_(universidad)',
      '',
    );
    expect(r.texto).toBe(
      'Mira [\\[esto\\]](https://es.wikipedia.org/wiki/UNIMAR_%28universidad%29)',
    );
  });
});

describe('aplicarComandoMarkdown', () => {
  it('envuelve la selección en cada estilo inline', () => {
    expect(
      aplicarComandoMarkdown('hola', { start: 0, end: 4 }, 'negrita').texto,
    ).toBe('**hola**');
    expect(
      aplicarComandoMarkdown('hola', { start: 0, end: 4 }, 'cursiva').texto,
    ).toBe('*hola*');
    expect(
      aplicarComandoMarkdown('hola', { start: 0, end: 4 }, 'tachado').texto,
    ).toBe('~~hola~~');
  });
});
