// Tests de proximaClase (cálculo puro, sin red/DB). Los casos usan fechas
// construidas en local (new Date(y, m, d, h, min)) para no depender de la
// tz del entorno de CI.
import { proximaClase } from './proxima-clase';
import type { MateriaActualDTO } from './types';

// Semana de referencia: 2026-10-07 es MIÉRCOLES (local).
const MIERCOLES = new Date(2026, 9, 7, 10, 20, 0, 0); // mié 10:20 (getDay=3)
const MIERCOLES_TARDE = new Date(2026, 9, 7, 17, 0, 0, 0); // mié 17:00: ya salió de clase

function materia(overrides: Partial<MateriaActualDTO> = {}): MateriaActualDTO {
  return {
    id: 'mat-1',
    codigo: 'AUS1205341',
    nombre: 'Auditoría de Sistemas',
    creditos: 3,
    es_actual: true,
    profesor: 'Daniela López',
    aula: 'A21',
    horario: 'Mié 10:20-12:35 (A21) · Jue 11:50-01:35 (A40)',
    dias_semana: [3, 4],
    hora_inicio: '10:20',
    hora_fin: '12:35',
    cortes: [],
    ...overrides,
  };
}

function franjas() {
  return [
    { dia_semana: 3, aula: 'A21', hora_inicio: '10:20', hora_fin: '12:35' },
    { dia_semana: 4, aula: 'A40', hora_inicio: '11:50', hora_fin: '13:35' },
  ];
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
    // 10:20-12:35 contiene 10:20 (inicio inclusive)
    expect(r?.enCurso).toBe(true);
    expect(r?.minutosRestantes).toBe(0);
    expect(r?.inicio.getHours()).toBe(10);
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

  it('con franjas, en curso usa la franja del día y su aula exacta', () => {
    const r = proximaClase(
      [materia({ franjas: franjas(), dias_semana: undefined, hora_inicio: undefined })],
      MIERCOLES,
    );
    expect(r?.enCurso).toBe(true);
    expect(r?.aula).toBe('A21');
    expect(r?.inicio.getHours()).toBe(10);
  });

  it('con franjas, la segunda franja habilita la clase del jueves con su aula', () => {
    const r = proximaClase(
      [materia({ franjas: franjas(), dias_semana: undefined, hora_inicio: undefined })],
      MIERCOLES_TARDE,
    );
    expect(r?.enCurso).toBe(false);
    expect(r?.inicio.getDay()).toBe(4); // jueves
    expect(r?.inicio.getHours()).toBe(11);
    expect(r?.aula).toBe('A40');
  });

  it('franjas tienen prioridad sobre el horario plano (si difieren)', () => {
    const mezcla = materia({
      franjas: franjas(),
      // plano apuntaría a otra ocurrencia distinta: debe GANAR la franja
      dias_semana: [6],
      hora_inicio: '08:00',
    });
    const r = proximaClase([mezcla], MIERCOLES_TARDE);
    expect(r?.inicio.getDay()).toBe(4);
    expect(r?.inicio.getHours()).toBe(11);
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
