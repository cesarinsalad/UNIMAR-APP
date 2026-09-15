import {
  decrementarTotal,
  marcarLeidaEnPaginas,
  marcarTodasEnPaginas,
} from './cambios-lectura';
import type { Notificacion } from '../types';

function notificacion(overrides: Partial<Notificacion> = {}): Notificacion {
  return {
    id: 'n-1',
    usuarioId: 'u-1',
    tipo: 'COMUNICADO_PUBLICADO',
    titulo: 't',
    cuerpo: 'c',
    referenciaId: null,
    leida: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const paginaA = [notificacion({ id: 'a1' }), notificacion({ id: 'a2' })];
const paginaB = [notificacion({ id: 'b1' })];

describe('marcarLeidaEnPaginas', () => {
  it('marca solo la notificación solicitada, en la página que esté', () => {
    const resultado = marcarLeidaEnPaginas([paginaA, paginaB], 'b1');
    expect(resultado[1]![0]!.leida).toBe(true);
    expect(resultado[0]!.every((n) => !n.leida)).toBe(true);
  });

  it('es idempotente si ya estaba leída', () => {
    const leida = [notificacion({ id: 'a1', leida: true })];
    const resultado = marcarLeidaEnPaginas([leida], 'a1');
    expect(resultado[0]![0]!.leida).toBe(true);
  });

  it('id inexistente deja la caché intacta', () => {
    const resultado = marcarLeidaEnPaginas([paginaA], 'x');
    expect(resultado[0]!.every((n) => !n.leida)).toBe(true);
  });
});

describe('marcarTodasEnPaginas', () => {
  it('marcar todas las páginas como leídas', () => {
    const resultado = marcarTodasEnPaginas([paginaA, paginaB]);
    expect(resultado.flat().every((n) => n.leida)).toBe(true);
  });
});

describe('decrementarTotal', () => {
  it.each([
    [5, 4],
    [1, 0],
    [0, 0],
    [undefined, 0],
  ])('%v → { total: %v }', (entrada, esperado) => {
    expect(decrementarTotal(entrada)).toEqual({ total: esperado });
  });
});