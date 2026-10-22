// Tests del kardex mock: pura transformación de tuplas, sin red ni DB.
import { describe, expect, it } from 'vitest';
import { MockUniversityAcademicService } from './mockUniversityAcademicService';

const svc = new MockUniversityAcademicService();

describe('MockUniversityAcademicService (kardex)', () => {
  it('devuelve 3 materias actuales y 70 históricas', async () => {
    const materias = await svc.materias('30065516');
    const actuales = materias.filter((m) => m.es_actual);
    const historicas = materias.filter((m) => !m.es_actual);
    expect(actuales.length).toBe(3);
    expect(historicas.length).toBe(70);
  });

  it('nota <10 marca REPROBADA (Matemática II primera vez), ≥10 APROBADA', async () => {
    const materias = (await svc.materias('30065516')).filter((m) => !m.es_actual);
    const mate2 = materias.filter((m) => m.codigo === 'MAT0305341');
    expect(mate2.length).toBe(2);
    expect(mate2[0]?.nota_final).toBe(5);
    expect(mate2[0]?.estado).toBe('REPROBADA');
    expect(mate2[1]?.nota_final).toBe(15);
    expect(mate2[1]?.estado).toBe('APROBADA');
  });

  it("cursos 'AP' quedan APROBADA con nota null (práctica profesional)", async () => {
    const materias = (await svc.materias('30065516')).filter((m) => !m.es_actual);
    const practica = materias.find((m) => m.codigo === 'PRP1107441');
    expect(practica?.estado).toBe('APROBADA');
    expect(practica?.nota_final).toBeNull();
    expect(practica?.periodo).toBe('2026-2');
  });

  it('materias actuales con franjas exactas por día', async () => {
    const actuales = (await svc.materias('30065516')).filter((m) => m.es_actual);
    const aud = actuales.find((m) => m.codigo === 'AUS1205341') as Extract<
      (typeof actuales)[number],
      { es_actual: true }
    >;
    expect(aud.seccion).toBe('P-01');
    expect(aud.franjas).toEqual([
      { dia_semana: 3, aula: 'A21', hora_inicio: '10:20', hora_fin: '12:35' },
      { dia_semana: 4, aula: 'A40', hora_inicio: '11:50', hora_fin: '13:35' },
    ]);
  });

  it('materiaDetalle encuentra por id y 404 para id desconocido', async () => {
    const materias = await svc.materias('30065516');
    const primera = materias[0]!;
    await expect(svc.materiaDetalle('30065516', 'hist-1')).resolves.toMatchObject({
      id: 'hist-1',
      es_actual: false,
    });
    await expect(svc.materiaDetalle('30065516', primera.id)).resolves.toBeDefined();
    await expect(svc.materiaDetalle('30065516', 'no-existe')).rejects.toThrow(/no encontrada/);
  });
});
