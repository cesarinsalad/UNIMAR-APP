import { describe, expect, it } from 'vitest';
import type { DbTx } from '../../../shared/kernel/db';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { Claims } from '../../../shared/security/jwt';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors';
import type { Adjunto } from '../domain/adjunto';
import type { Comunicado } from '../domain/comunicado';
import type { IComunicadoRepository, IAdjuntoRepository, IStorageService } from '../domain/ports';
import { SolicitarUrlCarga } from './solicitarUrlCarga';
import { RegistrarAdjunto } from './registrarAdjunto';
import { ListarAdjuntos } from './listarAdjuntos';
import { UrlDescargaAdjunto } from './urlDescargaAdjunto';
import { EliminarAdjunto } from './eliminarAdjunto';

const fakeTx = {} as DbTx;

function makeUnitOfWork() {
  return {
    runAs: async <T>(_claims: Record<string, unknown>, fn: (tx: DbTx) => Promise<T>) => fn(fakeTx),
  } as unknown as UnitOfWork;
}

function makeClaims(sub: string, role: 'COMUNICADOR' | 'ADMIN' | 'ESTUDIANTE', decanato_id: number | null = 5): Claims {
  return { sub, role, decanato_id, nombre: 'U' };
}

function makeComunicado(overrides: Partial<Comunicado> = {}): Comunicado {
  return {
    id: 'com-id',
    titulo: 't',
    cuerpo: 'c',
    autorId: 'uuid-c',
    estado: 'BORRADOR',
    aprobadoPor: null,
    motivoRechazo: null,
    publicadoAt: null,
    programadoPara: null,
    expiraAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    decanatoIds: [5],
    ...overrides,
  };
}

function makeAdjunto(overrides: Partial<Adjunto> = {}): Adjunto {
  return {
    id: 'adj-id',
    comunicadoId: 'com-id',
    storagePath: 'com-id/uuid-captura.png',
    nombre: 'captura.png',
    mimeType: 'image/png',
    createdAt: new Date(),
    ...overrides,
  };
}

interface MockCalls {
  storage: { method: string; args: unknown[] }[];
  repoAdjunto: { method: string; args: unknown[] }[];
}

function makeStorage(overrides: Partial<IStorageService> = {}): { storage: IStorageService; calls: MockCalls['storage'] } {
  const calls: MockCalls['storage'] = [];
  const storage: IStorageService = {
    crearUrlCargaFirmada: async (path) => {
      calls.push({ method: 'crearUrlCargaFirmada', args: [path] });
      return { urlFirmada: `https://signed-upload/${path}`, token: 'tok-123', path };
    },
    crearUrlDescargaFirmada: async (path, ttl) => {
      calls.push({ method: 'crearUrlDescargaFirmada', args: [path, ttl] });
      return `https://signed-download/${path}`;
    },
    existeObjeto: async (path) => {
      calls.push({ method: 'existeObjeto', args: [path] });
      return true;
    },
    eliminarObjeto: async (path) => {
      calls.push({ method: 'eliminarObjeto', args: [path] });
    },
    ...overrides,
  };
  return { storage, calls };
}

function makeAdjuntoRepo(initial: Adjunto | null = null): { repo: IAdjuntoRepository; calls: MockCalls['repoAdjunto'] } {
  const calls: MockCalls['repoAdjunto'] = [];
  const repo: IAdjuntoRepository = {
    crear: async (tx, input) => {
      calls.push({ method: 'crear', args: [input] });
      return makeAdjunto({ ...input, id: 'adj-new' });
    },
    listarPorComunicado: async (tx, comunicadoId) => {
      calls.push({ method: 'listarPorComunicado', args: [comunicadoId] });
      return initial && initial.comunicadoId === comunicadoId ? [initial] : [];
    },
    buscarPorId: async (tx, id) => {
      calls.push({ method: 'buscarPorId', args: [id] });
      return initial && initial.id === id ? initial : null;
    },
    eliminar: async (tx, id) => {
      calls.push({ method: 'eliminar', args: [id] });
      return initial?.id === id;
    },
  };
  return { repo, calls };
}

function makeComRepo(initial: Comunicado | null = null): IComunicadoRepository {
  return {
    crear: async () => initial ?? makeComunicado(),
    agregarAudiencias: async () => undefined,
    buscarPorId: async (tx, id) => (initial && initial.id === id ? initial : null),
    listar: async () => (initial ? [initial] : []),
    actualizar: async (tx, id, input) => (initial ? ({ ...initial, ...input } as Comunicado) : null),
    transicionarEstado: async (tx, id, input) => (initial ? ({ ...initial, ...input } as Comunicado) : null),
    registrarLectura: async () => undefined,
    contarLecturas: async () => 0,
  };
}

describe('SolicitarUrlCarga', () => {
  it('COMUNICADOR solicita URL de carga para su BORRADOR OK', async () => {
    const comRepo = makeComRepo(makeComunicado({ autorId: 'uuid-c', estado: 'BORRADOR' }));
    const { storage, calls } = makeStorage();
    const uc = new SolicitarUrlCarga(comRepo, storage, makeUnitOfWork());
    const result = await uc.ejecutar(
      makeClaims('uuid-c', 'COMUNICADOR', 5),
      { comunicadoId: 'com-id', nombre: 'captura.png', mimeType: 'image/png', tamano: 1024 },
    );
    expect(result.path.startsWith('com-id/')).toBe(true);
    expect(result.urlFirmada).toMatch(/^https:\/\/signed-upload\//);
    expect(calls.some((c) => c.method === 'crearUrlCargaFirmada')).toBe(true);
  });

  it('COMUNICADOR a comunicado ajeno -> ForbiddenError', async () => {
    const comRepo = makeComRepo(makeComunicado({ autorId: 'uuid-other', estado: 'BORRADOR' }));
    const { storage } = makeStorage();
    const uc = new SolicitarUrlCarga(comRepo, storage, makeUnitOfWork());
    await expect(
      uc.ejecutar(
        makeClaims('uuid-c', 'COMUNICADOR', 5),
        { comunicadoId: 'com-id', nombre: 'x.png', mimeType: 'image/png', tamano: 100 },
      ),
    ).rejects.toThrow(ForbiddenError);
  });

  it('COMUNICADOR a comunicado en PENDIENTE -> BadRequestError', async () => {
    const comRepo = makeComRepo(makeComunicado({ autorId: 'uuid-c', estado: 'PENDIENTE' }));
    const { storage } = makeStorage();
    const uc = new SolicitarUrlCarga(comRepo, storage, makeUnitOfWork());
    await expect(
      uc.ejecutar(
        makeClaims('uuid-c', 'COMUNICADOR', 5),
        { comunicadoId: 'com-id', nombre: 'x.png', mimeType: 'image/png', tamano: 100 },
      ),
    ).rejects.toThrow(BadRequestError);
  });

  it('MIME no permitido -> BadRequestError', async () => {
    const comRepo = makeComRepo();
    const { storage } = makeStorage();
    const uc = new SolicitarUrlCarga(comRepo, storage, makeUnitOfWork());
    await expect(
      uc.ejecutar(
        makeClaims('uuid-c', 'COMUNICADOR', 5),
        { comunicadoId: 'com-id', nombre: 'x.exe', mimeType: 'application/x-msdownload', tamano: 100 },
      ),
    ).rejects.toThrow(BadRequestError);
  });

  it('Tamaño mayor a 5MB -> BadRequestError', async () => {
    const comRepo = makeComRepo();
    const { storage } = makeStorage();
    const uc = new SolicitarUrlCarga(comRepo, storage, makeUnitOfWork());
    await expect(
      uc.ejecutar(
        makeClaims('uuid-c', 'COMUNICADOR', 5),
        { comunicadoId: 'com-id', nombre: 'x.png', mimeType: 'image/png', tamano: 6 * 1024 * 1024 },
      ),
    ).rejects.toThrow(BadRequestError);
  });

  it('Tamaño cero o negativo -> BadRequestError', async () => {
    const comRepo = makeComRepo();
    const { storage } = makeStorage();
    const uc = new SolicitarUrlCarga(comRepo, storage, makeUnitOfWork());
    await expect(
      uc.ejecutar(
        makeClaims('uuid-c', 'COMUNICADOR', 5),
        { comunicadoId: 'com-id', nombre: 'x.png', mimeType: 'image/png', tamano: 0 },
      ),
    ).rejects.toThrow(BadRequestError);
  });

  it('ESTUDIANTE -> ForbiddenError', async () => {
    const comRepo = makeComRepo();
    const { storage } = makeStorage();
    const uc = new SolicitarUrlCarga(comRepo, storage, makeUnitOfWork());
    await expect(
      uc.ejecutar(
        makeClaims('uuid-est', 'ESTUDIANTE', 5),
        { comunicadoId: 'com-id', nombre: 'x.png', mimeType: 'image/png', tamano: 100 },
      ),
    ).rejects.toThrow(ForbiddenError);
  });
});

describe('RegistrarAdjunto', () => {
  it('COMUNICADOR registra adjunto cuando el objeto existe en Storage', async () => {
    const comRepo = makeComRepo(makeComunicado({ autorId: 'uuid-c', estado: 'BORRADOR' }));
    const { storage } = makeStorage();
    const { repo, calls } = makeAdjuntoRepo();
    const uc = new RegistrarAdjunto(comRepo, repo, storage, makeUnitOfWork());
    const result = await uc.ejecutar(
      makeClaims('uuid-c', 'COMUNICADOR', 5),
      {
        comunicadoId: 'com-id',
        path: 'com-id/uuid-captura.png',
        nombre: 'captura.png',
        mimeType: 'image/png',
        tamano: 1024,
      },
    );
    expect(result.id).toBe('adj-new');
    expect(calls.some((c) => c.method === 'crear')).toBe(true);
  });

  it('Path que no corresponde al comunicado -> BadRequestError', async () => {
    const comRepo = makeComRepo();
    const { storage } = makeStorage();
    const { repo } = makeAdjuntoRepo();
    const uc = new RegistrarAdjunto(comRepo, repo, storage, makeUnitOfWork());
    await expect(
      uc.ejecutar(
        makeClaims('uuid-c', 'COMUNICADOR', 5),
        {
          comunicadoId: 'com-id',
          path: 'otro-com/uuid-x.png',
          nombre: 'x.png',
          mimeType: 'image/png',
          tamano: 100,
        },
      ),
    ).rejects.toThrow(BadRequestError);
  });

  it('Objeto no existe en Storage -> BadRequestError', async () => {
    const comRepo = makeComRepo(makeComunicado({ autorId: 'uuid-c', estado: 'BORRADOR' }));
    const { storage } = makeStorage({ existeObjeto: async () => false });
    const { repo } = makeAdjuntoRepo();
    const uc = new RegistrarAdjunto(comRepo, repo, storage, makeUnitOfWork());
    await expect(
      uc.ejecutar(
        makeClaims('uuid-c', 'COMUNICADOR', 5),
        {
          comunicadoId: 'com-id',
          path: 'com-id/uuid-x.png',
          nombre: 'x.png',
          mimeType: 'image/png',
          tamano: 100,
        },
      ),
    ).rejects.toThrow(BadRequestError);
  });

  it('COMUNICADOR a comunicado ajeno -> ForbiddenError', async () => {
    const comRepo = makeComRepo(makeComunicado({ autorId: 'uuid-other', estado: 'BORRADOR' }));
    const { storage } = makeStorage();
    const { repo } = makeAdjuntoRepo();
    const uc = new RegistrarAdjunto(comRepo, repo, storage, makeUnitOfWork());
    await expect(
      uc.ejecutar(
        makeClaims('uuid-c', 'COMUNICADOR', 5),
        {
          comunicadoId: 'com-id',
          path: 'com-id/uuid-x.png',
          nombre: 'x.png',
          mimeType: 'image/png',
          tamano: 100,
        },
      ),
    ).rejects.toThrow(ForbiddenError);
  });

  it('ESTUDIANTE -> ForbiddenError', async () => {
    const comRepo = makeComRepo();
    const { storage } = makeStorage();
    const { repo } = makeAdjuntoRepo();
    const uc = new RegistrarAdjunto(comRepo, repo, storage, makeUnitOfWork());
    await expect(
      uc.ejecutar(
        makeClaims('uuid-est', 'ESTUDIANTE', 5),
        {
          comunicadoId: 'com-id',
          path: 'com-id/uuid-x.png',
          nombre: 'x.png',
          mimeType: 'image/png',
          tamano: 100,
        },
      ),
    ).rejects.toThrow(ForbiddenError);
  });
});

describe('ListarAdjuntos', () => {
  it('Lista adjuntos cuando el comunicado es visible', async () => {
    const comRepo = makeComRepo(makeComunicado());
    const { repo, calls } = makeAdjuntoRepo(makeAdjunto());
    const uc = new ListarAdjuntos(comRepo, repo, makeUnitOfWork());
    const result = await uc.ejecutar(makeClaims('uuid-est', 'ESTUDIANTE', 5), 'com-id');
    expect(result.length).toBe(1);
    expect(calls.some((c) => c.method === 'listarPorComunicado')).toBe(true);
  });

  it('Comunicado no visible -> NotFoundError', async () => {
    const comRepo = makeComRepo(null);
    const { repo } = makeAdjuntoRepo();
    const uc = new ListarAdjuntos(comRepo, repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeClaims('uuid-est', 'ESTUDIANTE', 5), 'com-missing')).rejects.toThrow(NotFoundError);
  });
});

describe('UrlDescargaAdjunto', () => {
  it('Genera URL de descarga cuando el adjunto es visible', async () => {
    const { storage, calls } = makeStorage();
    const { repo } = makeAdjuntoRepo(makeAdjunto());
    const uc = new UrlDescargaAdjunto(repo, storage, makeUnitOfWork());
    const result = await uc.ejecutar(makeClaims('uuid-est', 'ESTUDIANTE', 5), 'adj-id');
    expect(result.url).toMatch(/^https:\/\/signed-download\//);
    expect(calls.some((c) => c.method === 'crearUrlDescargaFirmada')).toBe(true);
  });

  it('Adjunto no visible -> NotFoundError', async () => {
    const { storage } = makeStorage();
    const { repo } = makeAdjuntoRepo(null);
    const uc = new UrlDescargaAdjunto(repo, storage, makeUnitOfWork());
    await expect(uc.ejecutar(makeClaims('uuid-est', 'ESTUDIANTE', 5), 'adj-missing')).rejects.toThrow(NotFoundError);
  });
});

describe('EliminarAdjunto', () => {
  it('Autor elimina su adjunto y luego el objeto en Storage', async () => {
    const comRepo = makeComRepo(makeComunicado({ autorId: 'uuid-c' }));
    const { storage, calls } = makeStorage();
    const { repo } = makeAdjuntoRepo(makeAdjunto({ storagePath: 'com-id/uuid-x.png' }));
    const uc = new EliminarAdjunto(comRepo, repo, storage, makeUnitOfWork());
    await uc.ejecutar(makeClaims('uuid-c', 'COMUNICADOR', 5), 'adj-id');
    expect(calls.some((c) => c.method === 'eliminarObjeto')).toBe(true);
  });

  it('ADMIN elimina cualquier adjunto', async () => {
    const comRepo = makeComRepo(makeComunicado({ autorId: 'uuid-other' }));
    const { storage, calls } = makeStorage();
    const { repo } = makeAdjuntoRepo(makeAdjunto());
    const uc = new EliminarAdjunto(comRepo, repo, storage, makeUnitOfWork());
    await uc.ejecutar(makeClaims('uuid-a', 'ADMIN', null), 'adj-id');
    expect(calls.some((c) => c.method === 'eliminarObjeto')).toBe(true);
  });

  it('COMUNICADOR elimina adjunto ajeno -> ForbiddenError', async () => {
    const comRepo = makeComRepo(makeComunicado({ autorId: 'uuid-other' }));
    const { storage } = makeStorage();
    const { repo } = makeAdjuntoRepo(makeAdjunto());
    const uc = new EliminarAdjunto(comRepo, repo, storage, makeUnitOfWork());
    await expect(uc.ejecutar(makeClaims('uuid-c', 'COMUNICADOR', 5), 'adj-id')).rejects.toThrow(ForbiddenError);
  });

  it('Adjunto no existe -> NotFoundError', async () => {
    const comRepo = makeComRepo();
    const { storage } = makeStorage();
    const { repo } = makeAdjuntoRepo(null);
    const uc = new EliminarAdjunto(comRepo, repo, storage, makeUnitOfWork());
    await expect(uc.ejecutar(makeClaims('uuid-a', 'ADMIN', null), 'adj-missing')).rejects.toThrow(NotFoundError);
  });
});
