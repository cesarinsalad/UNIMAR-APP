import {
  etiquetaLecturas,
  puedeVerEstadisticas,
} from './estadisticas';

describe('puedeVerEstadisticas', () => {
  it('autor (COMUNICADOR) → sí', () => {
    expect(puedeVerEstadisticas('COMUNICADOR', true)).toBe(true);
  });

  it('ADMIN ajeno → sí', () => {
    expect(puedeVerEstadisticas('ADMIN', false)).toBe(true);
  });

  it('COMUNICADOR ajeno y ESTUDIANTE ajeno → no', () => {
    expect(puedeVerEstadisticas('COMUNICADOR', false)).toBe(false);
    expect(puedeVerEstadisticas('ESTUDIANTE', false)).toBe(false);
  });

  it('esAutor gana aunque el rol sea bajo (fiel al caso de uso del BFF)', () => {
    // En la práctica un ESTUDIANTE nunca es autor, pero la regla server-side
    // es: role!==ADMIN && autorId!==sub → 403; ser autor basta.
    expect(puedeVerEstadisticas('ESTUDIANTE', true)).toBe(true);
  });

  it('sin sesión → no', () => {
    expect(puedeVerEstadisticas(null, true)).toBe(false);
  });
});

describe('etiquetaLecturas', () => {
  it.each([
    [0, '0 lecturas'],
    [1, '1 lectura'],
    [2, '2 lecturas'],
    [250, '250 lecturas'],
  ])('%v → %s', (n, esperado) => {
    expect(etiquetaLecturas(n)).toBe(esperado);
  });
});