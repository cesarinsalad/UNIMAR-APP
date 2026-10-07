// Tests unitarios de AsignarPortada (sin DB): mocks estructurales de
// IComunicadoRepository + IAdjuntoRepository + UnitOfWork, siguiendo el
// patrón de comunicados.test.ts.
import { describe, expect, it } from 'vitest';
import type { DbTx } from '../../../shared/kernel/db';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { Claims } from '../../../shared/security/jwt';
import type { Adjunto } from '../domain/adjunto';
import type { Comunicado } from '../domain/comunicado';
import type { IAdjuntoRepository, IComunicadoRepository } from '../domain/ports';
import { AsignarPortada } from './asignarPortada';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors';

const fakeTx = {} as DbTx;

function makeUnitOfWork() {
  return {
    runAs: async <T>(_claims: Record<string, unknown>, fn: (tx: DbTx) => Promise<T>) =>
      fn(fakeTx),
  } as unknown as UnitOfWork;
}

function makeComunicador(sub = 'uuid-com', decanato_id: number | null = 5): Claims {
  return { sub, role: 'COMUNICADOR', decanato_id, nombre: 'COM' };
}

function makeAdmin(sub = 'uuid-admin', decanato_id: number | null = null): Claims {
  return { sub, role: 'ADMIN', decanato_id, nombre: 'Admin' };
}

function makeAdjunto(overrides: Partial<Adjunto> = {}): Adjunto {
  return {
    id: 'adj-1',
    comunicadoId: 'com-id',
    storagePath: 'com-id/foto.png',
    nombre: 'foto.png',
    mimeType: 'image/png',
    createdAt: new Date(),
    ...overrides,
  };
}

function makeComunicado(overrides: Partial<Comunicado> = {}): Comunicado {
  return {
    id: 'com-id',
    titulo: 'Comunicado',
    cuerpo: 'c',
    autorId: 'uuid-com',
    estado: 'BORRADOR',
    aprobadoPor: null,
    motivoRechazo: null,
    publicadoAt: null,
    programadoPara: null,
    expiraAt: null,
    imagenPath: null,
    imagenPie: null,
    categoria: null,
    autorNombre: 'Autor',
    createdAt: new Date(),
    updatedAt: new Date(),
    decanatoIds: [5],
    ...overrides,
  };
}

interface Store {
  comunicado: Comunicado;
  adjuntos: Adjunto[];
}

function makeRepos(store: Store) {
  const comRepo: IComunicadoRepository = {
    crear: async () => store.comunicado,
    agregarAudiencias: async () => undefined,
    buscarPorId: async (_tx, id) => (store.comunicado.id === id ? store.comunicado : null),
    listar: async () => [store.comunicado],
    actualizar: async (_tx, id, input) => {
      if (store.comunicado.id !== id) return null;
      store.comunicado = { ...store.comunicado, ...input } as Comunicado;
      return store.comunicado;
    },
    transicionarEstado: async (_tx, id, input) => {
      if (store.comunicado.id !== id) return null;
      store.comunicado = { ...store.comunicado, ...input } as Comunicado;
      return store.comunicado;
    },
    registrarLectura: async () => undefined,
    contarLecturas: async () => 0,
    asignarPortada: async (_tx, id, imagenPath, imagenPie) => {
      if (store.comunicado.id !== id) return null;
      store.comunicado = { ...store.comunicado, imagenPath, imagenPie };
      return store.comunicado;
    },
  };
  const adjRepo: IAdjuntoRepository = {
    crear: async () => store.adjuntos[0]!,
    listarPorComunicado: async (_tx, comunicadoId) =>
      store.adjuntos.filter((a) => a.comunicadoId === comunicadoId),
    buscarPorId: async (_tx, id) => store.adjuntos.find((a) => a.id === id) ?? null,
    eliminar: async (_tx, id) => store.adjuntos.some((a) => a.id === id),
  };
  return { comRepo, adjRepo };
}

describe('AsignarPortada', () => {
  it('asigna la portada de un adjunto imagen del propio comunicado', async () => {
    const store: Store = {
      comunicado: makeComunicado(),
      adjuntos: [makeAdjunto()],
    };
    const { comRepo, adjRepo } = makeRepos(store);
    const uc = new AsignarPortada(comRepo, adjRepo, makeUnitOfWork());
    const result = await uc.ejecutar(makeComunicador(), 'com-id', 'adj-1');
    expect(result.imagenPath).toBe('com-id/foto.png');
    expect(result.imagenPie).toBeNull();
  });

  it('asigna con pie (caption) la portada' , async () => {
    const store: Store = {
      comunicado: makeComunicado(),
      adjuntos: [makeAdjunto()],
    };
    const { comRepo, adjRepo } = makeRepos(store);
    const uc = new AsignarPortada(comRepo, adjRepo, makeUnitOfWork());
    const result = await uc.ejecutar(
      makeComunicador(),
      'com-id',
      'adj-1',
      'Campus central durante el inicio del periodo académico',
    );
    expect(result.imagenPie).toBe('Campus central durante el inicio del periodo académico');
  });

  it('ADMIN también puede asignar', async () => {
    const store: Store = {
      comunicado: makeComunicado({ autorId: 'otro' }),
      adjuntos: [makeAdjunto()],
    };
    const { comRepo, adjRepo } = makeRepos(store);
    const uc = new AsignarPortada(comRepo, adjRepo, makeUnitOfWork());
    const result = await uc.ejecutar(makeAdmin(), 'com-id', 'adj-1');
    expect(result.imagenPath).toBe('com-id/foto.png');
  });

  it('COMUNICADOR ajeno -> ForbiddenError', async () => {
    const store: Store = {
      comunicado: makeComunicado({ autorId: 'otro-com' }),
      adjuntos: [makeAdjunto()],
    };
    const { comRepo, adjRepo } = makeRepos(store);
    const uc = new AsignarPortada(comRepo, adjRepo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeComunicador(), 'com-id', 'adj-1'),
    ).rejects.toThrow(ForbiddenError);
  });

  it('estado PENDIENTE -> BadRequestError', async () => {
    const store: Store = {
      comunicado: makeComunicado({ estado: 'PENDIENTE' }),
      adjuntos: [makeAdjunto()],
    };
    const { comRepo, adjRepo } = makeRepos(store);
    const uc = new AsignarPortada(comRepo, adjRepo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeComunicador(), 'com-id', 'adj-1'),
    ).rejects.toThrow(BadRequestError);
  });

  it('adjunto de otro comunicado -> BadRequestError', async () => {
    const store: Store = {
      comunicado: makeComunicado(),
      adjuntos: [makeAdjunto({ comunicadoId: 'otro-com' })],
    };
    const { comRepo, adjRepo } = makeRepos(store);
    const uc = new AsignarPortada(comRepo, adjRepo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeComunicador(), 'com-id', 'adj-1'),
    ).rejects.toThrow(BadRequestError);
  });

  it('adjunto no imagen (pdf) -> BadRequestError', async () => {
    const store: Store = {
      comunicado: makeComunicado(),
      adjuntos: [makeAdjunto({ mimeType: 'application/pdf' })],
    };
    const { comRepo, adjRepo } = makeRepos(store);
    const uc = new AsignarPortada(comRepo, adjRepo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeComunicador(), 'com-id', 'adj-1'),
    ).rejects.toThrow(BadRequestError);
  });

  it('adjunto inexistente -> BadRequestError', async () => {
    const store: Store = { comunicado: makeComunicado(), adjuntos: [] };
    const { comRepo, adjRepo } = makeRepos(store);
    const uc = new AsignarPortada(comRepo, adjRepo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeComunicador(), 'com-id', 'adj-missing'),
    ).rejects.toThrow(BadRequestError);
  });

  it('comunicado inexistente -> NotFoundError', async () => {
    const store: Store = { comunicado: makeComunicado(), adjuntos: [makeAdjunto()] };
    const { comRepo, adjRepo } = makeRepos(store);
    const uc = new AsignarPortada(comRepo, adjRepo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeComunicador(), 'com-missing', 'adj-1'),
    ).rejects.toThrow(NotFoundError);
  });

  it('adjuntoId null limpia la portada', async () => {
    const store: Store = {
      comunicado: makeComunicado({ imagenPath: 'com-id/foto.png' }),
      adjuntos: [],
    };
    const { comRepo, adjRepo } = makeRepos(store);
    const uc = new AsignarPortada(comRepo, adjRepo, makeUnitOfWork());
    const result = await uc.ejecutar(makeComunicador(), 'com-id', null);
    expect(result.imagenPath).toBeNull();
  });
});
