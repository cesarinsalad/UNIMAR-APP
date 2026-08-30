// Tests unitarios de los casos de uso de Calendario (sin base de datos ni red).
// Los colaboradores se sustituyen por mocks estructurales que cumplen las
// interfaces de puertos (IEventoRepository + UnitOfWork): esto aísla la
// lógica pura del caso de uso — "qué recibe, qué delega a quién y qué reglas
// aplica" — sin depender de que haya Supabase arriba.
// fakeTx es un objeto vacío porque los repositorios mock nunca lo tocan.

import { describe, expect, it } from 'vitest';
import type { DbTx } from '../../../shared/kernel/db';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { EventBus, EventoOficialCreado, TrabajoPostCommit } from '../../../shared/kernel/eventos';
import type { Claims } from '../../../shared/security/jwt';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors';
import type { IEventoRepository } from '../domain/ports';
import type { Evento } from '../domain/evento';
import { CrearEvento } from './crearEvento';
import { EditarEvento } from './editarEvento';
import { EliminarEvento } from './eliminarEvento';
import { ListarEventos } from './listarEventos';
import { ObtenerEvento } from './obtenerEvento';

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
    tipo: 'PERSONAL',
    usuarioId: 'uuid-est',
    inicioAt: new Date('2030-01-01T10:00:00Z'),
    finAt: null,
    diaCompleto: false,
    recordatorioMinutos: null,
    createdAt: new Date(),
    decanatoIds: [],
    ...overrides,
  };
}

interface RepoCall {
  method: string;
  args: unknown[];
}

function makeRepo(initial: Evento | null = null): { repo: IEventoRepository; calls: RepoCall[] } {
  const calls: RepoCall[] = [];
  let store: Evento | null = initial;
  const repo: IEventoRepository = {
    crear: async (_tx, input) => {
      calls.push({ method: 'crear', args: [input] });
      const id = 'evt-new';
      const creado = makeEvento({
        id,
        titulo: input.titulo,
        descripcion: input.descripcion,
        tipo: input.tipo,
        usuarioId: input.usuarioId,
        inicioAt: new Date(input.inicioAt),
        finAt: input.finAt ? new Date(input.finAt) : null,
        diaCompleto: input.diaCompleto,
        recordatorioMinutos: input.recordatorioMinutos,
      });
      store = creado;
      return creado;
    },
    agregarAudiencias: async (_tx, id, decanatoIds) => {
      calls.push({ method: 'agregarAudiencias', args: [id, decanatoIds] });
      if (store && store.id === id) {
        store = { ...store, decanatoIds };
      }
    },
    buscarPorId: async (_tx, id) => {
      calls.push({ method: 'buscarPorId', args: [id] });
      return store && store.id === id ? store : null;
    },
    listar: async (_tx, filtro) => {
      calls.push({ method: 'listar', args: [filtro] });
      return store ? [store] : [];
    },
    actualizar: async (_tx, id, input) => {
      calls.push({ method: 'actualizar', args: [id, input] });
      if (store && store.id === id) {
        store = { ...store, ...input } as Evento;
      }
      return store;
    },
    eliminar: async (_tx, id) => {
      calls.push({ method: 'eliminar', args: [id] });
      if (store?.id === id) {
        store = null;
        return true;
      }
      return false;
    },
    eventosConRecordatorioPendiente: async () => [],
    destinatariosDeEvento: async () => [],
    filtrarYaEnviados: async (_tx, _id, ids) => ids,
    marcarRecordatoriosEnviados: async () => undefined,
  };
  return { repo, calls };
}

describe('CrearEvento', () => {
  it('PERSONAL: cualquier usuario autenticado puede crear', async () => {
    const { repo, calls } = makeRepo();
    const uc = new CrearEvento(repo, makeUnitOfWork());
    await uc.ejecutar(makeEstClaims(), {
      titulo: 't',
      tipo: 'PERSONAL',
      inicioAt: '2030-01-01T10:00:00Z',
    });
    expect(calls.some((c) => c.method === 'crear')).toBe(true);
    const crearArgs = calls.find((c) => c.method === 'crear')?.args[0] as { usuarioId: string };
    expect(crearArgs.usuarioId).toBe('uuid-est');
  });

  it('OFICIAL: ESTUDIANTE -> ForbiddenError', async () => {
    const { repo } = makeRepo();
    const uc = new CrearEvento(repo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeEstClaims(), {
        titulo: 't',
        tipo: 'OFICIAL',
        inicioAt: '2030-01-01T10:00:00Z',
        decanatoIds: [5],
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('OFICIAL: ADMIN GLOBAL (audiencia vacía) OK', async () => {
    const { repo, calls } = makeRepo();
    const uc = new CrearEvento(repo, makeUnitOfWork());
    await uc.ejecutar(makeAdminClaims(), {
      titulo: 'global',
      tipo: 'OFICIAL',
      inicioAt: '2030-01-01T10:00:00Z',
    });
    expect(calls.some((c) => c.method === 'crear')).toBe(true);
    expect(calls.some((c) => c.method === 'agregarAudiencias')).toBe(false);
  });

  it('OFICIAL: ADMIN con audiencia específica OK', async () => {
    const { repo, calls } = makeRepo();
    const uc = new CrearEvento(repo, makeUnitOfWork());
    await uc.ejecutar(makeAdminClaims(), {
      titulo: 'local',
      tipo: 'OFICIAL',
      inicioAt: '2030-01-01T10:00:00Z',
      decanatoIds: [3],
    });
    expect(calls.some((c) => c.method === 'agregarAudiencias')).toBe(true);
  });

  it('OFICIAL: COMUNICADOR a su propio decanato OK', async () => {
    const { repo, calls } = makeRepo();
    const uc = new CrearEvento(repo, makeUnitOfWork());
    await uc.ejecutar(makeComClaims('uuid-c', 5), {
      titulo: 't',
      tipo: 'OFICIAL',
      inicioAt: '2030-01-01T10:00:00Z',
      decanatoIds: [5],
    });
    expect(calls.some((c) => c.method === 'crear')).toBe(true);
  });

  it('OFICIAL: COMUNICADOR a otro decanato -> BadRequestError', async () => {
    const { repo } = makeRepo();
    const uc = new CrearEvento(repo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeComClaims('uuid-c', 5), {
        titulo: 't',
        tipo: 'OFICIAL',
        inicioAt: '2030-01-01T10:00:00Z',
        decanatoIds: [3],
      }),
    ).rejects.toThrow(BadRequestError);
  });

  it('OFICIAL: COMUNICADOR GLOBAL (audiencia vacía) -> BadRequestError', async () => {
    const { repo } = makeRepo();
    const uc = new CrearEvento(repo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeComClaims('uuid-c', 5), {
        titulo: 't',
        tipo: 'OFICIAL',
        inicioAt: '2030-01-01T10:00:00Z',
      }),
    ).rejects.toThrow(BadRequestError);
  });

  it('OFICIAL: fin_at < inicio_at -> BadRequestError', async () => {
    const { repo } = makeRepo();
    const uc = new CrearEvento(repo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeAdminClaims(), {
        titulo: 't',
        tipo: 'OFICIAL',
        inicioAt: '2030-01-01T11:00:00Z',
        finAt: '2030-01-01T10:00:00Z',
        decanatoIds: [5],
      }),
    ).rejects.toThrow(BadRequestError);
  });

  it('OFICIAL con EventBus: publica EVENTO_OFICIAL_CREADO y ejecuta job post-commit', async () => {
    const { repo } = makeRepo();
    const jobEjecutado = await new Promise<boolean>((resolve) => {
      const job: TrabajoPostCommit = async () => {
        resolve(true);
      };
      const bus = {
        publicar: async (evento: EventoOficialCreado) => {
          expect(evento.tipo).toBe('EVENTO_OFICIAL_CREADO');
          expect(evento.titulo).toBe('reunion');
          return [job];
        },
      } as unknown as EventBus;
      const uc = new CrearEvento(repo, makeUnitOfWork(), bus);
      uc.ejecutar(makeAdminClaims(), {
        titulo: 'reunion',
        tipo: 'OFICIAL',
        inicioAt: '2030-01-01T10:00:00Z',
        decanatoIds: [5],
      }).then(() => {});
    });
    expect(jobEjecutado).toBe(true);
  });

  it('PERSONAL con EventBus: no emite evento', async () => {
    const { repo } = makeRepo();
    let publicarLlamado = false;
    const bus = {
      publicar: async () => {
        publicarLlamado = true;
        return [];
      },
    } as unknown as EventBus;
    const uc = new CrearEvento(repo, makeUnitOfWork(), bus);
    await uc.ejecutar(makeEstClaims(), {
      titulo: 't',
      tipo: 'PERSONAL',
      inicioAt: '2030-01-01T10:00:00Z',
    });
    expect(publicarLlamado).toBe(false);
  });
});

describe('EditarEvento', () => {
  it('PERSONAL: el dueño puede editar', async () => {
    const { repo, calls } = makeRepo(
      makeEvento({ usuarioId: 'uuid-est', tipo: 'PERSONAL' }),
    );
    const uc = new EditarEvento(repo, makeUnitOfWork());
    await uc.ejecutar(makeEstClaims(), 'evt-id', { titulo: 'nuevo' });
    expect(calls.some((c) => c.method === 'actualizar')).toBe(true);
  });

  it('PERSONAL: otro usuario -> ForbiddenError', async () => {
    const { repo } = makeRepo(
      makeEvento({ usuarioId: 'uuid-otro', tipo: 'PERSONAL' }),
    );
    const uc = new EditarEvento(repo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeEstClaims('uuid-est'), 'evt-id', { titulo: 'x' }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('OFICIAL: ADMIN edita cualquiera', async () => {
    const { repo, calls } = makeRepo(
      makeEvento({ usuarioId: 'uuid-com', tipo: 'OFICIAL', decanatoIds: [5] }),
    );
    const uc = new EditarEvento(repo, makeUnitOfWork());
    await uc.ejecutar(makeAdminClaims(), 'evt-id', { titulo: 'x' });
    expect(calls.some((c) => c.method === 'actualizar')).toBe(true);
  });

  it('OFICIAL: COMUNICADOR edita su propio evento', async () => {
    const { repo, calls } = makeRepo(
      makeEvento({ usuarioId: 'uuid-com', tipo: 'OFICIAL', decanatoIds: [5] }),
    );
    const uc = new EditarEvento(repo, makeUnitOfWork());
    await uc.ejecutar(makeComClaims('uuid-com', 5), 'evt-id', { titulo: 'x' });
    expect(calls.some((c) => c.method === 'actualizar')).toBe(true);
  });

  it('OFICIAL: COMUNICADOR edita evento ajeno -> ForbiddenError', async () => {
    const { repo } = makeRepo(
      makeEvento({ usuarioId: 'uuid-otro-com', tipo: 'OFICIAL', decanatoIds: [3] }),
    );
    const uc = new EditarEvento(repo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeComClaims('uuid-com', 5), 'evt-id', { titulo: 'x' }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('OFICIAL: COMUNICADOR cambia audiencia a otro decanato -> BadRequestError', async () => {
    const { repo } = makeRepo(
      makeEvento({ usuarioId: 'uuid-com', tipo: 'OFICIAL', decanatoIds: [5] }),
    );
    const uc = new EditarEvento(repo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeComClaims('uuid-com', 5), 'evt-id', { decanatoIds: [3] }),
    ).rejects.toThrow(BadRequestError);
  });

  it('fin_at < inicio_at resultante -> BadRequestError', async () => {
    const { repo } = makeRepo(
      makeEvento({
        usuarioId: 'uuid-est',
        tipo: 'PERSONAL',
        inicioAt: new Date('2030-01-01T10:00:00Z'),
      }),
    );
    const uc = new EditarEvento(repo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeEstClaims(), 'evt-id', {
        finAt: '2030-01-01T09:00:00Z',
      }),
    ).rejects.toThrow(BadRequestError);
  });

  it('No existe -> NotFoundError', async () => {
    const { repo } = makeRepo(null);
    const uc = new EditarEvento(repo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeEstClaims(), 'evt-missing', { titulo: 'x' }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('EliminarEvento', () => {
  it('PERSONAL: el dueño puede eliminar', async () => {
    const { repo, calls } = makeRepo(
      makeEvento({ usuarioId: 'uuid-est', tipo: 'PERSONAL' }),
    );
    const uc = new EliminarEvento(repo, makeUnitOfWork());
    await uc.ejecutar(makeEstClaims(), 'evt-id');
    expect(calls.some((c) => c.method === 'eliminar')).toBe(true);
  });

  it('PERSONAL: otro usuario -> ForbiddenError', async () => {
    const { repo } = makeRepo(
      makeEvento({ usuarioId: 'uuid-otro', tipo: 'PERSONAL' }),
    );
    const uc = new EliminarEvento(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeEstClaims('uuid-est'), 'evt-id')).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('OFICIAL: ADMIN elimina cualquiera', async () => {
    const { repo, calls } = makeRepo(
      makeEvento({ usuarioId: 'uuid-com', tipo: 'OFICIAL' }),
    );
    const uc = new EliminarEvento(repo, makeUnitOfWork());
    await uc.ejecutar(makeAdminClaims(), 'evt-id');
    expect(calls.some((c) => c.method === 'eliminar')).toBe(true);
  });

  it('OFICIAL: COMUNICADOR elimina el suyo', async () => {
    const { repo, calls } = makeRepo(
      makeEvento({ usuarioId: 'uuid-com', tipo: 'OFICIAL' }),
    );
    const uc = new EliminarEvento(repo, makeUnitOfWork());
    await uc.ejecutar(makeComClaims('uuid-com', 5), 'evt-id');
    expect(calls.some((c) => c.method === 'eliminar')).toBe(true);
  });

  it('OFICIAL: COMUNICADOR ajeno -> ForbiddenError', async () => {
    const { repo } = makeRepo(
      makeEvento({ usuarioId: 'uuid-otro-com', tipo: 'OFICIAL' }),
    );
    const uc = new EliminarEvento(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeComClaims('uuid-com', 5), 'evt-id')).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('No existe -> NotFoundError', async () => {
    const { repo } = makeRepo(null);
    const uc = new EliminarEvento(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeEstClaims(), 'evt-missing')).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe('ListarEventos', () => {
  it('delega al repo con los filtros recibidos', async () => {
    const { repo, calls } = makeRepo(makeEvento());
    const uc = new ListarEventos(repo, makeUnitOfWork());
    const desde = new Date('2030-01-01T00:00:00Z');
    const hasta = new Date('2030-01-31T23:59:59Z');
    const result = await uc.ejecutar(makeEstClaims(), { desde, hasta, limit: 20, offset: 0 });
    expect(result).toHaveLength(1);
    const args = calls.find((c) => c.method === 'listar')?.args[0] as {
      desde: Date;
      hasta: Date;
      limit: number;
      offset: number;
    };
    expect(args.desde).toEqual(desde);
    expect(args.hasta).toEqual(hasta);
    expect(args.limit).toBe(20);
    expect(args.offset).toBe(0);
  });
});

describe('ObtenerEvento', () => {
  it('devuelve el evento', async () => {
    const { repo } = makeRepo(makeEvento({ usuarioId: 'uuid-est', tipo: 'PERSONAL' }));
    const uc = new ObtenerEvento(repo, makeUnitOfWork());
    const result = await uc.ejecutar(makeEstClaims(), 'evt-id');
    expect(result.id).toBe('evt-id');
  });

  it('No existe -> NotFoundError', async () => {
    const { repo } = makeRepo(null);
    const uc = new ObtenerEvento(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeEstClaims(), 'evt-missing')).rejects.toThrow(
      NotFoundError,
    );
  });
});
