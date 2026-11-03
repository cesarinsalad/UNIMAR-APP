import {
  aplanarPaginas,
  aplanarPaginasConTotal,
  esPaginaRemota,
  siguienteOffset,
  siguienteOffsetConTotal,
  totalDePaginas,
} from './paginar';

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

// ── Variante con total (comunicados/eventos) ────────────────────────────────

describe('siguienteOffsetConTotal', () => {
  const pagina = { items: [{ id: 1 }], total: 45 };

  it('undefined → fin de la lista', () => {
    expect(siguienteOffsetConTotal(undefined, 0, 20)).toBeUndefined();
  });

  it('la página consumida no agota el total → siguiente offset', () => {
    const llena = { items: Array.from({ length: 20 }, (_, i) => ({ id: i })), total: 45 };
    expect(siguienteOffsetConTotal(llena, 0, 20)).toBe(20);
    expect(siguienteOffsetConTotal(llena, 20, 20)).toBe(40);
  });

  it('la página agota el total exacto → fin', () => {
    const agotadora = { items: [{ id: 1 }], total: 21 };
    expect(siguienteOffsetConTotal(agotadora, 20, 20)).toBeUndefined();
  });

  it('página incompleta (por debajo del pageSize) → fin', () => {
    expect(siguienteOffsetConTotal(pagina, 0, 20)).toBeUndefined();
  });

  it('página legacy (array del wire viejo) → no crashea, fin por longitud', () => {
    const llenaLegacy = Array.from({ length: 20 }, (_, i) => ({ id: i }));
    const incompletaLegacy = Array.prototype.slice.call(llenaLegacy, 0, 7);
    expect(siguienteOffsetConTotal(llenaLegacy, 0, 20)).toBe(20);
    expect(siguienteOffsetConTotal(incompletaLegacy, 20, 20)).toBeUndefined();
    expect(siguienteOffsetConTotal([], 40, 20)).toBeUndefined();
  });
});

describe('esPaginaRemota', () => {
  it('reconoce el envoltorio {items,total} y rechaza un array plano', () => {
    expect(esPaginaRemota<{ id: number }>({ items: [], total: 0 })).toBe(true);
    expect(esPaginaRemota([{ id: 1 }])).toBe(false);
    expect(esPaginaRemota(null)).toBe(false);
  });
});

describe('totalDePaginas', () => {
  it('toma el total de la primera página; sin datos → 0', () => {
    expect(totalDePaginas([{ items: [{ id: 1 }, { id: 2 }], total: 38 }])).toBe(38);
    expect(totalDePaginas(undefined)).toBe(0);
  });

  it('páginas legacy (arrays, wire viejo) → suma lo cargado (cota parcial)', () => {
    const llenita = Array.from({ length: 20 }, (_, i) => ({ id: i }));
    expect(totalDePaginas([llenita, [{ id: 21 }]])).toBe(21);
    expect(totalDePaginas([llenita])).toBe(20);
  });
});

describe('aplanarPaginasConTotal', () => {
  it('aplana los items de páginas {items,total}', () => {
    expect(
      aplanarPaginasConTotal([
        { items: [{ id: 1 }, { id: 2 }], total: 3 },
        { items: [{ id: 3 }], total: 3 },
      ]),
    ).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(aplanarPaginasConTotal(undefined)).toEqual([]);
  });
});