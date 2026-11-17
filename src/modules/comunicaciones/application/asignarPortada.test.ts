// Tests unitarios de AsignarPortada (sin DB): mocks estructurales de
// IComunicadoRepository + IAdjuntoRepository + UnitOfWork, siguiendo el
// patrón de comunicados.test.ts.
import { describe, expect, it, vi } from 'vitest';
import type { DbTx } from '../../../shared/kernel/db';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { Claims } from '../../../shared/security/jwt';
import type { Adjunto } from '../domain/adjunto';
import type { Comunicado } from '../domain/comunicado';
import type {
  IAdjuntoRepository,
  IComunicadoRepository,
  IStorageService,
} from '../domain/ports';
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
    marcarEliminado: async () => false,
    registrarLectura: async () => undefined,
    contar: async () => 0,
    contarPorEstado: async () => ({ BORRADOR: 0, PENDIENTE: 0, PUBLICADO: 0, ARCHIVADO: 0 }),
    contarLecturas: async () => 0,
    listarAlcanceComunicados: async () => [],
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
    eliminar: async (_tx, id) => {
      const idx = store.adjuntos.findIndex((a) => a.id === id);
      if (idx === -1) return false;
      store.adjuntos.splice(idx, 1);
      return true;
    },
  };
  return { comRepo, adjRepo };
}

function makeStorageMock(): IStorageService {
  return {
    crearUrlCargaFirmada: vi.fn(),
    crearUrlDescargaFirmada: vi.fn(),
    existeObjeto: vi.fn(),
    eliminarObjeto: vi.fn().mockResolvedValue(undefined),
  };
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

  it('adjuntoId null limpia la portada y elimina la portada anterior de adjuntos y Storage', async () => {
    const portadaAnterior = makeAdjunto({
      id: 'adj-portada-anterior',
      storagePath: 'com-id/foto.png',
    });
    const adjuntoNormal = makeAdjunto({
      id: 'adj-doc',
      storagePath: 'com-id/guia.pdf',
      nombre: 'guia.pdf',
      mimeType: 'application/pdf',
    });
    const store: Store = {
      comunicado: makeComunicado({ imagenPath: 'com-id/foto.png' }),
      adjuntos: [portadaAnterior, adjuntoNormal],
    };
    const { comRepo, adjRepo } = makeRepos(store);
    const storage = makeStorageMock();
    const uc = new AsignarPortada(comRepo, adjRepo, makeUnitOfWork(), storage);

    const result = await uc.ejecutar(makeComunicador(), 'com-id', null);

    expect(result.imagenPath).toBeNull();
    expect(store.adjuntos).toEqual([adjuntoNormal]);
    expect(storage.eliminarObjeto).toHaveBeenCalledTimes(1);
    expect(storage.eliminarObjeto).toHaveBeenCalledWith('com-id/foto.png');
  });

  it('al reemplazar la portada elimina la portada anterior de adjuntos y Storage sin tocar los demás adjuntos', async () => {
    const portadaAnterior = makeAdjunto({
      id: 'adj-portada-1',
      storagePath: 'com-id/portada-1.png',
      nombre: 'portada-1.png',
    });
    const portadaNueva = makeAdjunto({
      id: 'adj-portada-2',
      storagePath: 'com-id/portada-2.jpg',
      nombre: 'portada-2.jpg',
      mimeType: 'image/jpeg',
    });
    const adjuntoNormal = makeAdjunto({
      id: 'adj-doc',
      storagePath: 'com-id/acta.pdf',
      nombre: 'acta.pdf',
      mimeType: 'application/pdf',
    });
    const store: Store = {
      comunicado: makeComunicado({ imagenPath: 'com-id/portada-1.png' }),
      adjuntos: [portadaAnterior, portadaNueva, adjuntoNormal],
    };
    const { comRepo, adjRepo } = makeRepos(store);
    const storage = makeStorageMock();
    const uc = new AsignarPortada(comRepo, adjRepo, makeUnitOfWork(), storage);

    const result = await uc.ejecutar(makeComunicador(), 'com-id', 'adj-portada-2');

    expect(result.imagenPath).toBe('com-id/portada-2.jpg');
    expect(store.adjuntos).toEqual([portadaNueva, adjuntoNormal]);
    expect(storage.eliminarObjeto).toHaveBeenCalledTimes(1);
    expect(storage.eliminarObjeto).toHaveBeenCalledWith('com-id/portada-1.png');
  });
});
