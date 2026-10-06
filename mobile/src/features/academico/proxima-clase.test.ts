// Tests de proximaClase (cálculo puro, sin red/DB). Los casos usan fechas
// construidas en local (new Date(y, m, d, h, min)) para no depender de la
// tz del entorno de CI.
import { proximaClase } from './proxima-clase';
import type { MateriaActualDTO } from './types';

// Semana de referencia: 2026-10-07 es MIÉRCOLES (local).
const MIERCOLES = new Date(2026, 9, 7, 10, 20, 0, 0); // mié 10:20 (getDay=3)

function materia(overrides: Partial<MateriaActualDTO> = {}): MateriaActualDTO {
  return {
    id: 'mat-1',
    codigo: 'IS-701',
    nombre: 'Bases de Datos II',
    creditos: 4,
    es_actual: true,
    profesor: 'Dra. Pérez',
    aula: 'A-12',
    horario: 'Lun-Mié 9:00-10:30',
    dias_semana: [1, 3],
    hora_inicio: '09:00',
    hora_fin: '10:30',
    cortes: [],
    ...overrides,
  };
}

describe('proximaClase', () => {
  it('clase de hoy más tarde → esa gana', () => {
    const r = proximaClase(
      [materia({ dias_semana: [3], hora_inicio: '14:00', hora_fin: '15:00' })],
      MIERCOLES,
    );
    expect(r?.enCurso).toBe(false);
    expect(r?.minutosRestantes).toBe(220); // 10:20 → 14:00
    expect(r?.inicio.getHours()).toBe(14);
  });

  it('clase de hoy ya terminó → próxima ocurrencia (viernes)', () => {
    const hoyPasada = proximaClase(
      // mié 10:20: la clase del mié ya terminó (09:00-10:30? no: terminó 10:30 > ahora? no, se puso fin 10:00)
      [materia({ dias_semana: [3], hora_inicio: '07:00', hora_fin: '08:00' })],
      MIERCOLES,
    );
    // siguiente mié, 6 días después
    expect(hoyPasada?.inicio.getDay()).toBe(3);
    expect(hoyPasada?.inicio.getDate()).toBe(14); // mié de la semana siguiente
  });

  it('en curso (ahora dentro de [inicio, fin)) → enCurso true y minutos 0', () => {
    const r = proximaClase([materia({ dias_semana: [3] })], MIERCOLES);
    // 09:00-10:30 contiene 10:20
    expect(r?.enCurso).toBe(true);
    expect(r?.minutosRestantes).toBe(0);
    expect(r?.inicio.getHours()).toBe(9);
  });

  it('la clase en curso tiene prioridad total (decisión Fase 1c)', () => {
    const enCurso = materia({
      id: 'a',
      dias_semana: [3],
      hora_inicio: '09:00',
      hora_fin: '11:00', // aún en curso a las 10:20
    });
    const futura = materia({
      id: 'b',
      dias_semana: [3],
      hora_inicio: '10:40', // empieza en 20 min
      hora_fin: '12:00',
    });
    const r = proximaClase([enCurso, futura], MIERCOLES);
    expect(r?.materia.id).toBe('a');
    expect(r?.enCurso).toBe(true);
    expect(r?.minutosRestantes).toBe(0);
  });

  it('gana la de menor inicio entre dos materias con diferentes días', () => {
    const jue = materia({ id: 'jue', dias_semana: [4], hora_inicio: '14:00', hora_fin: '15:00' }); // mañana
    const sab = materia({ id: 'sab', dias_semana: [6], hora_inicio: '09:00' }); // sábado
    const r = proximaClase([sab, jue], MIERCOLES);
    expect(r?.materia.id).toBe('jue');
  });

  it('tie de mismo momento → orden estable (posición del array)', () => {
    const a = materia({ id: 'a', dias_semana: [3], hora_inicio: '14:00', hora_fin: '15:00' });
    const b = materia({ id: 'b', dias_semana: [3], hora_inicio: '14:00', hora_fin: '15:00' });
    const r = proximaClase([a, b], MIERCOLES);
    expect(r?.materia.id).toBe('a');
  });

  it('materias sin horario estructurado se descartan', () => {
    const r = proximaClase(
      [
        materia({ dias_semana: undefined, hora_inicio: undefined }),
        materia({ dias_semana: undefined, hora_inicio: undefined, hora_fin: undefined }),
      ],
      MIERCOLES,
    );
    expect(r).toBeNull();
  });

  it('lista vacía → null', () => {
    expect(proximaClase([], MIERCOLES)).toBeNull();
  });

  it('clase en domingo (7 ISO-8601)', () => {
    const r = proximaClase(
      [materia({ dias_semana: [7], hora_inicio: '11:00', hora_fin: '12:00' })],
      MIERCOLES,
    );
    expect(r?.inicio.getDay()).toBe(0); // getDay() 0 = domingo
    expect(r?.minutosRestantes).toBe(5800); // mié 10:20 → dom 11:00 (4 días + 40 min)
  });
});
