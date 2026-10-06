// Prueba del contrato Zod de materias (borde COMPLETO): el mock/la API real
// alimenta materiaSchema; los campos de horario estructurado son opcionales
// para que una API que solo envía el string `horario` siga validando.
import { describe, expect, it } from 'vitest';
import { materiaSchema } from './dtos';

const baseActual = {
  id: 'mat-1',
  codigo: 'IS-701',
  nombre: 'Bases de Datos II',
  creditos: 4,
  es_actual: true as const,
  profesor: 'Dra. Pérez',
  aula: 'A-12',
  horario: 'Lun-Mié 9:00-10:30',
  cortes: [],
};

describe('materiaSchema (materia actual)', () => {
  it('valida fixture legacy SIN horario estructurado (backward compat)', () => {
    const result = materiaSchema.safeParse(baseActual);
    expect(result.success).toBe(true);
  });

  it('valida con horario estructurado', () => {
    const result = materiaSchema.safeParse({
      ...baseActual,
      dias_semana: [1, 3],
      hora_inicio: '09:00',
      hora_fin: '10:30',
    });
    expect(result.success).toBe(true);
  });

  it('rechaza hora inválida ("25:00" / "9:00" sin cero)', () => {
    expect(
      materiaSchema.safeParse({ ...baseActual, hora_inicio: '25:00' }).success,
    ).toBe(false);
    expect(
      materiaSchema.safeParse({ ...baseActual, hora_inicio: '9:00' }).success,
    ).toBe(false);
  });

  it('rechaza día fuera de 1..7', () => {
    expect(
      materiaSchema.safeParse({ ...baseActual, dias_semana: [0, 3] }).success,
    ).toBe(false);
    expect(
      materiaSchema.safeParse({ ...baseActual, dias_semana: [1, 8] }).success,
    ).toBe(false);
  });
});
