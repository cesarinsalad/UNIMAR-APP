import { aIsoFecha, aIsoHora, fechaDesdeIso, horaDesdeIso } from './selector-fecha';

/** Base fija: 15 oct 2026, 11:30 (local). */
const BASE = new Date(2026, 9, 15, 11, 30, 0, 0);

describe('aIsoFecha / aIsoHora', () => {
  it('serializa fecha local con ceros a la izquierda', () => {
    expect(aIsoFecha(BASE)).toBe('2026-10-15');
    expect(aIsoFecha(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('serializa hora local con ceros a la izquierda', () => {
    expect(aIsoHora(BASE)).toBe('11:30');
    expect(aIsoHora(new Date(2026, 9, 15, 3, 5))).toBe('03:05');
  });
});

describe('fechaDesdeIso', () => {
  it('reemplaza el día conservando la hora de la base', () => {
    const resultado = fechaDesdeIso(BASE, '2026-11-02');
    expect(resultado?.getFullYear()).toBe(2026);
    expect(resultado?.getMonth()).toBe(10);
    expect(resultado?.getDate()).toBe(2);
    expect(resultado?.getHours()).toBe(11);
    expect(resultado?.getMinutes()).toBe(30);
  });

  it('rechaza formatos incompletos o no numéricos', () => {
    expect(fechaDesdeIso(BASE, '')).toBeNull();
    expect(fechaDesdeIso(BASE, '2026-11')).toBeNull();
    expect(fechaDesdeIso(BASE, '2026-XX-02')).toBeNull();
    expect(fechaDesdeIso(BASE, 'a-b-c')).toBeNull();
  });

  it('rechaza fechas inexistentes que Date rullaría (02-30)', () => {
    expect(fechaDesdeIso(BASE, '2026-02-30')).toBeNull();
  });

  it('rechaza valores fuera de rango', () => {
    expect(fechaDesdeIso(BASE, '999-01-01')).toBeNull();
    expect(fechaDesdeIso(BASE, '2026-13-01')).toBeNull();
    expect(fechaDesdeIso(BASE, '2026-00-10')).toBeNull();
    expect(fechaDesdeIso(BASE, '2026-10-00')).toBeNull();
    expect(fechaDesdeIso(BASE, '2026-10-32')).toBeNull();
  });
});

describe('horaDesdeIso', () => {
  it('reemplaza la hora conservando la fecha de la base', () => {
    const resultado = horaDesdeIso(BASE, '08:45');
    expect(resultado?.getFullYear()).toBe(2026);
    expect(resultado?.getMonth()).toBe(9);
    expect(resultado?.getDate()).toBe(15);
    expect(resultado?.getHours()).toBe(8);
    expect(resultado?.getMinutes()).toBe(45);
  });

  it('rechaza formatos incompletos o no numéricos', () => {
    expect(horaDesdeIso(BASE, '')).toBeNull();
    expect(horaDesdeIso(BASE, '08')).toBeNull();
    expect(horaDesdeIso(BASE, 'aa:45')).toBeNull();
  });

  it('rechaza horas fuera de rango', () => {
    expect(horaDesdeIso(BASE, '24:00')).toBeNull();
    expect(horaDesdeIso(BASE, '-1:00')).toBeNull();
    expect(horaDesdeIso(BASE, '10:60')).toBeNull();
    expect(horaDesdeIso(BASE, '10:-5')).toBeNull();
  });
});
