import { formatoCedula, aRomano, etiquetaEstatus, matrizCarnet } from './carnet-helpers';

describe('formatoCedula (es-VE)', () => {
  it.each([
    ['20123456', 'V-20.123.456'],
    ['30065516', 'V-30.065.516'],
    ['12', 'V-12'],
  ])('%s → %s', (cruda, esperado) => {
    expect(formatoCedula(cruda)).toBe(esperado);
  });

  it('sin dígitos → guion largo', () => {
    expect(formatoCedula('')).toBe('—');
    expect(formatoCedula('xyz')).toBe('—');
  });
});

describe('aRomano (semestre → numeral 1–10)', () => {
  it.each([
    [1, 'I'],
    [9, 'IX'],
    [10, 'X'],
  ])('%v → %s', (n, esperado) => {
    expect(aRomano(n)).toBe(esperado);
  });

  it('fuera de rango → número crudo', () => {
    expect(aRomano(11)).toBe('11');
    expect(aRomano(0)).toBe('0');
  });
});

describe('etiquetaEstatus', () => {
  it('statuses conocidos → etiqueta', () => {
    expect(etiquetaEstatus('ACTIVO')).toBe('Estudiante Regular');
    expect(etiquetaEstatus('GRADUADO')).toBe('Graduado');
  });

  it('desconocido → crudo', () => {
    expect(etiquetaEstatus('X')).toBe('X');
  });
});

describe('matrizCarnet (estética, determinística)', () => {
  it('12×12 y determinística por semilla', () => {
    const a = matrizCarnet('20123456');
    const b = matrizCarnet('20123456');
    expect(a).toHaveLength(12);
    expect(a[0]).toHaveLength(12);
    expect(a).toEqual(b);
  });

  it('semillas distintas → matrices distintas', () => {
    expect(matrizCarnet('20123456')).not.toEqual(matrizCarnet('20123457'));
  });
});
