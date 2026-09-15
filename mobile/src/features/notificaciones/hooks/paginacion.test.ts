import { PAGE_SIZE_NOTIFICACIONES, calcularSiguienteOffset } from './paginacion';
import type { Notificacion } from '../types';

const paginaVacia: Notificacion[] = [];

function notificaciones(n: number): Notificacion[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `n-${i}`,
    usuarioId: 'u-1',
    tipo: 'COMUNICADO_PUBLICADO' as const,
    titulo: `Notificación ${i}`,
    cuerpo: 'cuerpo',
    referenciaId: null,
    leida: false,
    createdAt: new Date().toISOString(),
  }));
}

describe('calcularSiguienteOffset', () => {
  it('página llena → hay página siguiente (offset acumulado)', () => {
    expect(calcularSiguienteOffset(notificaciones(PAGE_SIZE_NOTIFICACIONES), 0)).toBe(20);
    expect(calcularSiguienteOffset(notificaciones(PAGE_SIZE_NOTIFICACIONES), 20)).toBe(40);
  });

  it('página incompleta → fin de la lista', () => {
    expect(calcularSiguienteOffset(notificaciones(7), 20)).toBeUndefined();
  });

  it('página vacía → fin de la lista', () => {
    expect(calcularSiguienteOffset(paginaVacia, 40)).toBeUndefined();
  });
});