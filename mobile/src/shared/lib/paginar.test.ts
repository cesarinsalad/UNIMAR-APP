import { aplanarPaginas, siguienteOffset } from './paginar';

const paginaLlena = Array.from({ length: 20 }, (_, i) => ({ id: i }));
const paginaIncompleta = paginaLlena.slice(0, 7);
const paginaVacia: unknown[] = [];

describe('siguienteOffset', () => {
  it('página llena → hay página siguiente (offset acumulado)', () => {
    expect(siguienteOffset(paginaLlena, 0, 20)).toBe(20);
    expect(siguienteOffset(paginaLlena, 20, 20)).toBe(40);
  });

  it('página incompleta → fin de la lista', () => {
    expect(siguienteOffset(paginaIncompleta, 20, 20)).toBeUndefined();
  });

  it('página vacía → fin de la lista', () => {
    expect(siguienteOffset(paginaVacia, 40, 20)).toBeUndefined();
  });

  it('pageSize variable (p. ej. 10)', () => {
    const diez = Array.from({ length: 10 }, (_, i) => ({ id: i }));
    expect(siguienteOffset(diez, 0, 10)).toBe(10);
    expect(siguienteOffset(diez.slice(0, 9), 10, 10)).toBeUndefined();
  });
});

describe('aplanarPaginas', () => {
  it('undefined → []', () => {
    expect(aplanarPaginas(undefined)).toEqual([]);
  });

  it('aplana múltiples páginas en orden', () => {
    const resultado = aplanarPaginas([
      [{ id: 1 }, { id: 2 }],
      [{ id: 3 }],
    ]);
    expect(resultado).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });
});