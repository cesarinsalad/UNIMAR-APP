import {
  etiquetaParticipantes,
  puedeVerEstadisticasEvento,
} from './estadisticas-evento';

describe('puedeVerEstadisticasEvento', () => {
  it('creador (COMUNICADOR) → sí', () => {
    expect(puedeVerEstadisticasEvento('COMUNICADOR', true, [5], 5)).toBe(true);
  });

  it('ADMIN ajeno → sí', () => {
    expect(puedeVerEstadisticasEvento('ADMIN', false, [5], 7)).toBe(true);
  });

  it('COMUNICADOR del decanato de la audiencia → sí (política del panel)', () => {
    expect(puedeVerEstadisticasEvento('COMUNICADOR', false, [5], 5)).toBe(true);
  });

  it('audiencia global ([]): entre comunicadores → sí', () => {
    expect(puedeVerEstadisticasEvento('COMUNICADOR', false, [], 7)).toBe(true);
    expect(puedeVerEstadisticasEvento('COMUNICADOR', false, [], null)).toBe(true);
  });

  it('COMUNICADOR de otro decanato → no', () => {
    expect(puedeVerEstadisticasEvento('COMUNICADOR', false, [5], 7)).toBe(false);
    expect(puedeVerEstadisticasEvento('COMUNICADOR', false, [5], null)).toBe(false);
  });

  it('ESTUDIANTE dueño de su PERSONAL → sí; ajeno → no', () => {
    expect(puedeVerEstadisticasEvento('ESTUDIANTE', true, [], null)).toBe(true);
    expect(puedeVerEstadisticasEvento('ESTUDIANTE', false, [5], 5)).toBe(false);
  });

  it('sin sesión → no', () => {
    expect(puedeVerEstadisticasEvento(null, true, [], null)).toBe(false);
  });
});

describe('etiquetaParticipantes', () => {
  it.each([
    [0, '0 en agenda'],
    [1, '1 en agenda'],
    [2, '2 en agenda'],
    [250, '250 en agenda'],
  ])('%v → %s', (n, esperado) => {
    expect(etiquetaParticipantes(n)).toBe(esperado);
  });
});
