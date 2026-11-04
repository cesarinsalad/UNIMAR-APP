import {
  etiquetaLecturas,
  puedeVerEstadisticas,
} from './estadisticas';

describe('puedeVerEstadisticas', () => {
  it('autor (COMUNICADOR) → sí', () => {
    expect(puedeVerEstadisticas('COMUNICADOR', true, [5], 5)).toBe(true);
  });

  it('ADMIN ajeno → sí', () => {
    expect(puedeVerEstadisticas('ADMIN', false, [5], 7)).toBe(true);
  });

  it('COMUNICADOR del decanato de la audiencia → sí (política del panel)', () => {
    expect(puedeVerEstadisticas('COMUNICADOR', false, [5], 5)).toBe(true);
  });

  it('audiencia global ([]): entre comunicadores → sí', () => {
    expect(puedeVerEstadisticas('COMUNICADOR', false, [], 7)).toBe(true);
    expect(puedeVerEstadisticas('COMUNICADOR', false, [], null)).toBe(true);
  });

  it('COMUNICADOR de otro decanato → no', () => {
    expect(puedeVerEstadisticas('COMUNICADOR', false, [5], 7)).toBe(false);
    expect(puedeVerEstadisticas('COMUNICADOR', false, [5], null)).toBe(false);
  });

  it('ESTUDIANTE ajeno → no (ni con su decanato en la audiencia)', () => {
    expect(puedeVerEstadisticas('ESTUDIANTE', false, [5], 5)).toBe(false);
  });

  it('esAutor gana aunque el rol sea bajo (fiel al caso de uso del BFF)', () => {
    // En la práctica un ESTUDIANTE nunca es autor, pero la regla server-side
    // es: ser autor basta. Las audiencias del comunicado no la anulan.
    expect(puedeVerEstadisticas('ESTUDIANTE', true, [5], 7)).toBe(true);
  });

  it('sin sesión → no', () => {
    expect(puedeVerEstadisticas(null, true, [], null)).toBe(false);
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
