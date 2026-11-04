// Tests unitarios de EstadisticasEvento (sin base de datos ni red), misma
// receta que eventos.test.ts: mocks estructurales de IEventoRepository y el
// UnitOfWork; fakeTx vacío porque los mocks nunca lo tocan.

import { describe, expect, it } from 'vitest';
import type { DbTx } from '../../../shared/kernel/db';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { Claims } from '../../../shared/security/jwt';
import { ForbiddenError, NotFoundError } from '../../../shared/errors';
import type { IEventoRepository } from '../domain/ports';
import type { Evento } from '../domain/evento';
import { EstadisticasEvento } from './estadisticasEvento';

const fakeTx = {} as DbTx;

function makeUnitOfWork() {
  return {
    runAs: async <T>(_claims: Record<string, unknown>, fn: (tx: DbTx) => Promise<T>) =>
      fn(fakeTx),
  } as unknown as UnitOfWork;
}

function makeAdminClaims(sub = 'uuid-admin', decanato_id: number | null = null): Claims {
  return { sub, role: 'ADMIN', decanato_id, nombre: 'Admin' };
}

function makeComClaims(sub = 'uuid-com', decanato_id: number | null = 5): Claims {
  return { sub, role: 'COMUNICADOR', decanato_id, nombre: 'COM' };
}

function makeEstClaims(sub = 'uuid-est', decanato_id: number | null = 5): Claims {
  return { sub, role: 'ESTUDIANTE', decanato_id, nombre: 'Est' };
}

function makeEvento(overrides: Partial<Evento> = {}): Evento {
  return {
    id: 'evt-id',
    titulo: 'Reunión',
    descripcion: null,
    tipo: 'OFICIAL',
    usuarioId: 'uuid-est',
    inicioAt: new Date('2030-01-01T10:00:00Z'),
    finAt: null,
    diaCompleto: false,
    recordatorioMinutos: null,
    lugar: null,
    createdAt: new Date(),
    decanatoIds: [],
    participo: false,
    ...overrides,
  };
}

function makeRepositorio(
  evento: Evento | null,
  participantes = 0,
): IEventoRepository {
  return {
    crear: async () => {
      throw new Error('no usado');
    },
    agregarAudiencias: async () => undefined,
    buscarPorId: async () => evento,
    listar: async () => [],
    contar: async () => 0,
    participar: async () => undefined,
    abandonar: async () => undefined,
    contarParticipantes: async () => participantes,
    actualizar: async () => evento,
    eliminar: async () => true,
    eventosConRecordatorioPendiente: async () => [],
    destinatariosDeEvento: async () => [],
    filtrarYaEnviados: async () => [],
    marcarRecordatoriosEnviados: async () => undefined,
    participacionIds: async () => [],
  };
}

describe('EstadisticasEvento', () => {
  it('ADMIN ve participantes', async () => {
    const repo = makeRepositorio(makeEvento({ usuarioId: 'uuid-other' }), 12);
    const uc = new EstadisticasEvento(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeAdminClaims(), 'evt-id')).resolves.toEqual({
      participantes: 12,
    });
  });

  it('Creador ve participantes de su evento', async () => {
    const repo = makeRepositorio(makeEvento({ usuarioId: 'uuid-com', tipo: 'PERSONAL' }), 3);
    const uc = new EstadisticasEvento(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeComClaims('uuid-com', 5), 'evt-id')).resolves.toEqual({
      participantes: 3,
    });
  });

  it('COMUNICADOR del decanato de la audiencia ve participantes', async () => {
    const repo = makeRepositorio(
      makeEvento({ usuarioId: 'uuid-other', decanatoIds: [5] }),
      8,
    );
    const uc = new EstadisticasEvento(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeComClaims('uuid-com', 5), 'evt-id')).resolves.toEqual({
      participantes: 8,
    });
  });

  it('Audiencia global ([]): cualquier COMUNICADOR ve participantes', async () => {
    const repo = makeRepositorio(makeEvento({ usuarioId: 'uuid-other', decanatoIds: [] }), 2);
    const uc = new EstadisticasEvento(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeComClaims('uuid-com', null), 'evt-id')).resolves.toEqual({
      participantes: 2,
    });
  });

  it('COMUNICADOR de otro decanato -> ForbiddenError', async () => {
    const repo = makeRepositorio(makeEvento({ usuarioId: 'uuid-other', decanatoIds: [5] }));
    const uc = new EstadisticasEvento(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeComClaims('uuid-com', 7), 'evt-id')).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('Estudiante -> ForbiddenError', async () => {
    const repo = makeRepositorio(makeEvento({ usuarioId: 'uuid-other' }));
    const uc = new EstadisticasEvento(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeEstClaims('uuid-est'), 'evt-id')).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('No existe -> NotFoundError', async () => {
    const repo = makeRepositorio(null);
    const uc = new EstadisticasEvento(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeAdminClaims(), 'evt-missing')).rejects.toThrow(NotFoundError);
  });
});
