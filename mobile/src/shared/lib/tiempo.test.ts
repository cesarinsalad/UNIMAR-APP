import { describe, expect, it } from '@jest/globals';

import { haceRelativo, minutosLectura } from './tiempo';

describe('haceRelativo', () => {
  it('menos de un minuto → "Ahora mismo"', () => {
    expect(haceRelativo('2026-10-06T10:00:00', new Date('2026-10-06T10:00:30'))).toBe('Ahora mismo');
  });

  it('minutos plurales y singulares', () => {
    expect(haceRelativo('2026-10-06T09:55:00', new Date('2026-10-06T10:00:00'))).toBe('hace 5 minutos');
    expect(haceRelativo('2026-10-06T09:59:00', new Date('2026-10-06T10:00:00'))).toBe('hace un minuto');
  });

  it('horas (plurales y singulares)', () => {
    expect(haceRelativo('2026-10-06T08:00:00', new Date('2026-10-06T10:00:00'))).toBe('hace 2 horas');
    expect(haceRelativo('2026-10-06T09:00:00', new Date('2026-10-06T10:00:30'))).toBe('hace una hora');
  });

  it('futuro: "en 2 horas" / "en 3 días"', () => {
    expect(haceRelativo('2026-10-06T12:00:00', new Date('2026-10-06T10:00:00'))).toBe('en 2 horas');
    expect(haceRelativo('2026-10-09T10:00:00', new Date('2026-10-06T10:00:00'))).toBe('en 3 días');
  });

  it('días pasados', () => {
    expect(haceRelativo('2026-10-03T10:30:00', new Date('2026-10-06T10:00:00'))).toBe('hace 3 días');
  });
});

describe('minutosLectura', () => {
  it('~200 palabras/min, mínimo 1', () => {
    expect(minutosLectura('')).toBe(1);
    expect(minutosLectura('una palabra')).toBe(1);
    expect(minutosLectura(Array(201).fill('x').join(' '))).toBe(2);
  });
});
