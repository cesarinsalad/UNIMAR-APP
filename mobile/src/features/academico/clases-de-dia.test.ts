// Tests de clasesDeDia (cálculo puro, sin red/DB). Fechas construidas en
// local para no depender de la tz del entorno de CI.
import { clasesDeDia } from './clases-de-dia';
import type { MateriaActualDTO } from './types';

// Semana de referencia: 2026-10-07 es MIÉRCOLES (local).
const MIERCOLES_10_20 = new Date(2026, 9, 7, 10, 20, 0, 0);
const TARDE = new Date(2026, 9, 7, 18, 0, 0, 0); // mié 18:00: todo terminó

function materia(id: string, overrides: Partial<MateriaActualDTO> = {}): MateriaActualDTO {
  return {
    id,
    codigo: `MAT-${id}`,
    nombre: `Materia ${id}`,
    creditos: 3,
    es_actual: true,
    profesor: 'Prof. X',
    aula: 'A21',
    horario: '',
    dias_semana: [3],
    hora_inicio: '10:20',
    hora_fin: '12:35',
    cortes: [],
    ...overrides,
  };
}

describe('clasesDeDia', () => {
  it('clase de hoy → una ventana con inicio/fin de hoy', () => {
    const r = clasesDeDia([materia('a')], MIERCOLES_10_20);
    expect(r).toHaveLength(1);
    expect(r[0]?.materia.id).toBe('a');
    expect(r[0]?.inicio.getHours()).toBe(10);
    expect(r[0]?.fin.getHours()).toBe(12);
    expect(r[0]?.estado).toBe('enCurso'); // 10:20 ∈ [10:20, 12:35)
    expect(r[0]?.aula).toBe('A21'); // aula del fallback planar
  });

  it('clases de otro día no aparecen', () => {
    const r = clasesDeDia([materia('a', { dias_semana: [4] })], MIERCOLES_10_20);
    expect(r).toHaveLength(0);
  });

  it('varias materias ordenadas por hora de inicio', () => {
    const tarde = materia('b', { hora_inicio: '14:00', hora_fin: '15:00' });
    const manana = materia('a', { hora_inicio: '08:00', hora_fin: '09:00' });
    const r = clasesDeDia([tarde, manana], MIERCOLES_10_20);
    expect(r.map((c) => c.materia.id)).toEqual(['a', 'b']);
  });

  it('franjas tienen prioridad y traen su aula exacta', () => {
    const r = clasesDeDia(
      [
        materia('a', {
          franjas: [
            { dia_semana: 3, aula: 'B10', hora_inicio: '16:00', hora_fin: '18:00' },
          ],
          dias_semana: undefined,
          hora_inicio: undefined,
        }),
      ],
      MIERCOLES_10_20,
    );
    expect(r).toHaveLength(1);
    expect(r[0]?.inicio.getHours()).toBe(16);
    expect(r[0]?.aula).toBe('B10');
    expect(r[0]?.estado).toBe('futura');
  });

  it('estados: pasada cuando fin ≤ ahora; nunca enCurso tras terminar', () => {
    const r = clasesDeDia(
      [materia('a', { hora_inicio: '10:20', hora_fin: '12:35' })],
      TARDE,
    );
    expect(r[0]?.estado).toBe('pasada');
  });

  it('ventana incoherente (fin < inicio) se descarta', () => {
    const r = clasesDeDia(
      [materia('a', { hora_inicio: '12:35', hora_fin: '10:20' })],
      MIERCOLES_10_20,
    );
    expect(r).toHaveLength(0);
  });

  it('materias sin horario estructurado aportan nada', () => {
    const r = clasesDeDia(
      [materia('a', { dias_semana: undefined, hora_inicio: undefined }), materia('b', {})],
      MIERCOLES_10_20,
    );
    expect(r).toHaveLength(1);
    expect(r[0]?.materia.id).toBe('b');
  });

  it('clase en domingo (7 ISO-8601) y solapamiento admitido (ambas en curso)', () => {
    const dom = new Date(2026, 9, 11, 12, 30, 0, 0); // dom 12:30 (getDay=0)
    const r = clasesDeDia(
      [
        materia('a', { dias_semana: [7], hora_inicio: '09:00', hora_fin: '13:00' }),
        materia('b', { dias_semana: [7], hora_inicio: '11:00', hora_fin: '15:00' }),
      ],
      dom,
    );
    expect(r.map((c) => c.estado)).toEqual(['enCurso', 'enCurso']);
  });

  it('lista vacía → vacío', () => {
    expect(clasesDeDia([], MIERCOLES_10_20)).toEqual([]);
  });
});
