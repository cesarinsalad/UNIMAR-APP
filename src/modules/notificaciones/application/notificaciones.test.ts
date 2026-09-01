// Tests unitarios de los casos de uso de Notificaciones (sin base de datos ni red).
// Los colaboradores se sustituyen por mocks estructurales que cumplen las
// interfaces de puertos (INotificacionRepository / IDispositivoRepository +
// UnitOfWork): esto aísla la lógica pura del caso de uso sin depender de que
// haya Supabase arriba. fakeTx es un objeto vacío porque los repositorios mock
// nunca lo tocan.

import { describe, expect, it } from 'vitest';
import type { DbTx } from '../../../shared/kernel/db';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { Claims } from '../../../shared/security/jwt';
import { NotFoundError } from '../../../shared/errors';
import type { INotificacionRepository, IDispositivoRepository } from '../domain/ports';
import type { Notificacion } from '../domain/notificacion';
import type { Dispositivo, Plataforma } from '../domain/dispositivo';
import { RegistrarDispositivo } from './registrarDispositivo';
import { ListarDispositivos } from './listarDispositivos';
import { EliminarDispositivo } from './eliminarDispositivo';
import { ListarNotificaciones } from './listarNotificaciones';
import { ContarNotificacionesNoLeidas } from './contarNotificacionesNoLeidas';
import { MarcarNotificacionLeida } from './marcarNotificacionLeida';
import { MarcarTodasLeidas } from './marcarTodasLeidas';

const fakeTx = {} as DbTx;

function makeUnitOfWork() {
  const calls: { method: 'run' | 'runAs'; claims?: unknown }[] = [];
  return {
    run: async <T>(fn: (tx: DbTx) => Promise<T>) => {
      calls.push({ method: 'run' });
      return fn(fakeTx);
    },
    runAs: async <T>(claims: Record<string, unknown>, fn: (tx: DbTx) => Promise<T>) => {
      calls.push({ method: 'runAs', claims });
      return fn(fakeTx);
    },
    _calls: calls,
  } as unknown as UnitOfWork & { _calls: typeof calls };
}

function makeClaims(sub = 'uuid-user', role = 'ESTUDIANTE', decanato_id: number | null = 5): Claims {
  return { sub, role, decanato_id, nombre: 'User' };
}

function makeNotificacion(overrides: Partial<Notificacion> = {}): Notificacion {
  return {
    id: 'notif-id',
    usuarioId: 'uuid-user',
    tipo: 'COMUNICADO_PUBLICADO',
    titulo: 'Nuevo comunicado publicado',
    cuerpo: 'Titulo del comunicado',
    referenciaId: 'com-id',
    leida: false,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeDispositivo(overrides: Partial<Dispositivo> = {}): Dispositivo {
  return {
    id: 'disp-id',
    usuarioId: 'uuid-user',
    pushToken: 'ExpoPushToken[abc123]',
    plataforma: 'android',
    registradoAt: new Date(),
    ultimoUsoAt: null,
    ...overrides,
  };
}

interface RepoCall {
  method: string;
  args: unknown[];
}

function makeDispositivoRepo(initial: Dispositivo | null = makeDispositivo()) {
  const calls: RepoCall[] = [];
  let store = initial;
  const repo: IDispositivoRepository = {
    upsert: async (tx, input) => {
      calls.push({ method: 'upsert', args: [input] });
      const creado = makeDispositivo({
        usuarioId: input.usuarioId,
        pushToken: input.pushToken,
        plataforma: input.plataforma,
      });
      store = creado;
      return creado;
    },
    listarPorUsuario: async (tx, usuarioId) => {
      calls.push({ method: 'listarPorUsuario', args: [usuarioId] });
      return store ? [store] : [];
    },
    eliminar: async (tx, id) => {
      calls.push({ method: 'eliminar', args: [id] });
      const ok = store?.id === id;
      if (ok) store = null;
      return ok;
    },
    tokensDeUsuarios: async (tx, usuarioIds) => {
      calls.push({ method: 'tokensDeUsuarios', args: [usuarioIds] });
      return [];
    },
  };
  return { repo, calls };
}

function makeNotificacionRepo(initial: Notificacion | null = makeNotificacion()) {
  const calls: RepoCall[] = [];
  let store = initial;
  const repo: INotificacionRepository = {
    listar: async (tx, filtro) => {
      calls.push({ method: 'listar', args: [filtro] });
      return store ? [store] : [];
    },
    contarNoLeidas: async (_tx) => {
      calls.push({ method: 'contarNoLeidas', args: [] });
      return store && !store.leida ? 1 : 0;
    },
    marcarLeida: async (tx, id) => {
      calls.push({ method: 'marcarLeida', args: [id] });
      if (store?.id !== id) return null;
      store = { ...store, leida: true };
      return store;
    },
    marcarTodasLeidas: async (_tx) => {
      calls.push({ method: 'marcarTodasLeidas', args: [] });
      if (store && !store.leida) {
        store = { ...store, leida: true };
        return 1;
      }
      return 0;
    },
    crearMasivo: async (tx, input) => {
      calls.push({ method: 'crearMasivo', args: [input] });
    },
  };
  return { repo, calls };
}

describe('RegistrarDispositivo', () => {
  it('fuerza usuarioId = claims.sub (nunca del body)', async () => {
    const { repo, calls } = makeDispositivoRepo();
    const uc = new RegistrarDispositivo(repo, makeUnitOfWork());

    await uc.ejecutar(makeClaims('uuid-real'), {
      pushToken: 'ExpoPushToken[nuevo]',
      plataforma: 'ios',
    });

    const upsertArgs = calls.find((c) => c.method === 'upsert')?.args[0] as {
      usuarioId: string;
      pushToken: string;
      plataforma: Plataforma;
    };
    expect(upsertArgs.usuarioId).toBe('uuid-real');
    expect(upsertArgs.pushToken).toBe('ExpoPushToken[nuevo]');
    expect(upsertArgs.plataforma).toBe('ios');
  });

  it('devuelve el dispositivo registrado', async () => {
    const { repo } = makeDispositivoRepo();
    const uc = new RegistrarDispositivo(repo, makeUnitOfWork());
    const result = await uc.ejecutar(makeClaims(), {
      pushToken: 'ExpoPushToken[nuevo]',
      plataforma: 'android',
    });
    expect(result.pushToken).toBe('ExpoPushToken[nuevo]');
  });

  it('ejecuta bajo uow.runAs (no run) para preservar identidad del usuario', async () => {
    const uow = makeUnitOfWork();
    const { repo } = makeDispositivoRepo();
    const uc = new RegistrarDispositivo(repo, uow);

    await uc.ejecutar(makeClaims('uuid-real'), {
      pushToken: 'ExpoPushToken[nuevo]',
      plataforma: 'android',
    });

    expect(uow._calls).toHaveLength(1);
    expect(uow._calls[0]?.method).toBe('runAs');
  });
});

describe('ListarDispositivos', () => {
  it('delega al repo con claims.sub', async () => {
    const { repo, calls } = makeDispositivoRepo();
    const uc = new ListarDispositivos(repo, makeUnitOfWork());
    const result = await uc.ejecutar(makeClaims('uuid-real'));
    expect(result).toHaveLength(1);
    expect(calls.find((c) => c.method === 'listarPorUsuario')?.args[0]).toBe('uuid-real');
  });
});

describe('EliminarDispositivo', () => {
  it('elimina su propio dispositivo', async () => {
    const { repo } = makeDispositivoRepo();
    const uc = new EliminarDispositivo(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeClaims(), 'disp-id')).resolves.toBeUndefined();
  });

  it('dispositivo ajeno o inexistente -> NotFoundError', async () => {
    const { repo } = makeDispositivoRepo();
    const uc = new EliminarDispositivo(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeClaims(), 'otro-id')).rejects.toThrow(NotFoundError);
  });
});

describe('ListarNotificaciones', () => {
  it('delega al repo los filtros recibidos', async () => {
    const { repo, calls } = makeNotificacionRepo();
    const uc = new ListarNotificaciones(repo, makeUnitOfWork());
    const result = await uc.ejecutar(makeClaims(), {
      soloNoLeidas: true,
      limit: 10,
      offset: 5,
    });
    expect(result).toHaveLength(1);
    expect(calls.find((c) => c.method === 'listar')?.args[0]).toEqual({
      soloNoLeidas: true,
      limit: 10,
      offset: 5,
    });
  });
});

describe('ContarNotificacionesNoLeidas', () => {
  it('devuelve { total }', async () => {
    const { repo } = makeNotificacionRepo(makeNotificacion({ leida: false }));
    const uc = new ContarNotificacionesNoLeidas(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeClaims())).resolves.toEqual({ total: 1 });
  });
});

describe('MarcarNotificacionLeida', () => {
  it('marca y devuelve la notificación', async () => {
    const { repo } = makeNotificacionRepo();
    const uc = new MarcarNotificacionLeida(repo, makeUnitOfWork());
    const result = await uc.ejecutar(makeClaims(), 'notif-id');
    expect(result.leida).toBe(true);
  });

  it('notificación ajena o inexistente -> NotFoundError', async () => {
    const { repo } = makeNotificacionRepo();
    const uc = new MarcarNotificacionLeida(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeClaims(), 'otra-id')).rejects.toThrow(NotFoundError);
  });
});

describe('MarcarTodasLeidas', () => {
  it('devuelve { actualizadas }', async () => {
    const { repo } = makeNotificacionRepo(makeNotificacion({ leida: false }));
    const uc = new MarcarTodasLeidas(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeClaims())).resolves.toEqual({ actualizadas: 1 });
  });

  it('sin no leídas devuelve 0', async () => {
    const { repo } = makeNotificacionRepo(makeNotificacion({ leida: true }));
    const uc = new MarcarTodasLeidas(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeClaims())).resolves.toEqual({ actualizadas: 0 });
  });
});
