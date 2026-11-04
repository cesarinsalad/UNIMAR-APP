import { tiposConsola } from './tipos-consola';

describe('tiposConsola', () => {
  it('ADMIN: oficiales, institucionales y feriados (sin personales)', () => {
    expect(tiposConsola('ADMIN')).toEqual(['OFICIAL', 'INSTITUCIONAL', 'FERIADO']);
  });

  it('COMUNICADOR: solo oficiales', () => {
    expect(tiposConsola('COMUNICADOR')).toEqual(['OFICIAL']);
  });

  it('ESTUDIANTE y sin rol: nada (el guard de la consola ya rebota, esto es defensa)', () => {
    expect(tiposConsola('ESTUDIANTE')).toEqual([]);
    expect(tiposConsola(null)).toEqual([]);
    expect(tiposConsola(undefined)).toEqual([]);
  });

  it('el default del formulario es el primero: OFICIAL', () => {
    expect(tiposConsola('ADMIN')[0]).toBe('OFICIAL');
    expect(tiposConsola('COMUNICADOR')[0]).toBe('OFICIAL');
  });
});
