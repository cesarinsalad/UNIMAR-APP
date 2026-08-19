import { describe, expect, it } from 'vitest';
import type { DbTx } from '../../../shared/kernel/db';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { Claims } from '../../../shared/security/jwt';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors';
import type { IComunicadoRepository } from '../domain/ports';
import type { Comunicado } from '../domain/comunicado';
import { CrearComunicado } from './crearComunicado';
import { EditarComunicado } from './editarComunicado';
import { SolicitarRevision } from './solicitarRevision';
import { AprobarComunicado } from './aprobarComunicado';
import { RechazarComunicado } from './rechazarComunicado';
import { PublicarComunicado } from './publicarComunicado';
import { ArchivarComunicado } from './archivarComunicado';
import { EstadisticasComunicado } from './estadisticasComunicado';
import { ObtenerComunicado } from './obtenerComunicado';
import { ListarComunicados } from './listarComunicados';

// fakeTx es un objeto vacío: los repositorios mock no lo tocan realmente.
const fakeTx = {} as DbTx;

function makeUnitOfWork() {
  return {
    runAs: async <T>(claims: Record<string, unknown>, fn: (tx: DbTx) => Promise<T>) => fn(fakeTx),
  } as unknown as UnitOfWork;
}

function makeComComunicador(sub = 'uuid-com-1', decanato_id = 5): Claims {
  return { sub, role: 'COMUNICADOR', decanato_id, nombre: 'COM' };
}

function makeAdminClaims(sub = 'uuid-admin', decanato_id = null): Claims {
  return { sub, role: 'ADMIN', decanato_id, nombre: 'Admin' };
}

function makeEstudianteClaims(sub = 'uuid-est', decanato_id = 5): Claims {
  return { sub, role: 'ESTUDIANTE', decanato_id, nombre: 'Estudiante' };
}

function makeComunicado(overrides: Partial<Comunicado> = {}): Comunicado {
  return {
    id: 'com-id',
    titulo: 't',
    cuerpo: 'c',
    autorId: 'uuid-com-1',
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

interface RepoCall {
  method: string;
  args: unknown[];
}

function makeRepo(initial: Comunicado | null = null): { repo: IComunicadoRepository; calls: RepoCall[] } {
  const calls: RepoCall[] = [];
  let store: Comunicado | null = initial;
  const repo: IComunicadoRepository = {
    crear: async (tx, input) => {
      calls.push({ method: 'crear', args: [input] });
      const id = 'com-new';
      const creado = makeComunicado({
        id,
        titulo: input.titulo,
        cuerpo: input.cuerpo,
        autorId: input.autorId,
        programadoPara: input.programadoPara ? new Date(input.programadoPara) : null,
        expiraAt: input.expiraAt ? new Date(input.expiraAt) : null,
      });
      store = creado;
      return creado;
    },
    agregarAudiencias: async (tx, id, decanatoIds) => {
      calls.push({ method: 'agregarAudiencias', args: [id, decanatoIds] });
    },
    buscarPorId: async (tx, id) => {
      calls.push({ method: 'buscarPorId', args: [id] });
      return store && store.id === id ? store : null;
    },
    listar: async (tx, filtro) => {
      calls.push({ method: 'listar', args: [filtro] });
      return store ? [store] : [];
    },
    actualizar: async (tx, id, input) => {
      calls.push({ method: 'actualizar', args: [id, input] });
      return store ? ({ ...store, ...input } as Comunicado) : null;
    },
    transicionarEstado: async (tx, id, input) => {
      calls.push({ method: 'transicionarEstado', args: [id, input] });
      return store ? ({ ...store, ...input } as Comunicado) : null;
    },
    registrarLectura: async (tx, id, userId) => {
      calls.push({ method: 'registrarLectura', args: [id, userId] });
    },
    contarLecturas: async (tx, id) => {
      calls.push({ method: 'contarLecturas', args: [id] });
      return 0;
    },
  };
  return { repo, calls };
}

describe('CrearComunicado', () => {
  it('COMUNICADOR crea a su propio decanato OK', async () => {
    const { repo, calls } = makeRepo();
    const uc = new CrearComunicado(repo, makeUnitOfWork());
    const result = await uc.ejecutar(makeComComunicador('uuid-c', 5), {
      titulo: 't',
      cuerpo: 'c',
      decanatoIds: [5],
    });
    expect(result.id).toBe('com-new');
    expect(calls.some((c) => c.method === 'crear')).toBe(true);
    expect(calls.some((c) => c.method === 'agregarAudiencias')).toBe(true);
  });

  it('COMUNICADOR a otro decanato -> BadRequestError', async () => {
    const { repo } = makeRepo();
    const uc = new CrearComunicado(repo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeComComunicador('uuid-c', 5), {
        titulo: 't',
        cuerpo: 'c',
        decanatoIds: [3],
      }),
    ).rejects.toThrow(BadRequestError);
  });

  it('COMUNICADOR con audiencia vacía (GLOBAL) -> BadRequestError', async () => {
    const { repo } = makeRepo();
    const uc = new CrearComunicado(repo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeComComunicador('uuid-c', 5), {
        titulo: 't',
        cuerpo: 'c',
        decanatoIds: [],
      }),
    ).rejects.toThrow(BadRequestError);
  });

  it('COMUNICADOR con audiencia de varios decanatos -> BadRequestError', async () => {
    const { repo } = makeRepo();
    const uc = new CrearComunicado(repo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeComComunicador('uuid-c', 5), {
        titulo: 't',
        cuerpo: 'c',
        decanatoIds: [5, 3],
      }),
    ).rejects.toThrow(BadRequestError);
  });

  it('ADMIN puede crear GLOBAL (audiencia vacía)', async () => {
    const { repo, calls } = makeRepo();
    const uc = new CrearComunicado(repo, makeUnitOfWork());
    await uc.ejecutar(makeAdminClaims(), {
      titulo: 'global',
      cuerpo: 'c',
      decanatoIds: [],
    });
    expect(calls.some((c) => c.method === 'crear')).toBe(true);
  });

  it('ADMIN puede crear a cualquier decanato', async () => {
    const { repo } = makeRepo();
    const uc = new CrearComunicado(repo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeAdminClaims(), {
        titulo: 't',
        cuerpo: 'c',
        decanatoIds: [3],
      }),
    ).resolves.toBeDefined();
  });

  it('ESTUDIANTE -> ForbiddenError', async () => {
    const { repo } = makeRepo();
    const uc = new CrearComunicado(repo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeEstudianteClaims(), {
        titulo: 't',
        cuerpo: 'c',
        decanatoIds: [5],
      }),
    ).rejects.toThrow(ForbiddenError);
  });
});

describe('EditarComunicado', () => {
  it('COMUNICADOR edita su propio BORRADOR OK', async () => {
    const { repo, calls } = makeRepo(makeComunicado({ autorId: 'uuid-c', estado: 'BORRADOR', decanatoIds: [5] }));
    const uc = new EditarComunicado(repo, makeUnitOfWork());
    await uc.ejecutar(makeComComunicador('uuid-c', 5), 'com-id', { titulo: 'nuevo' });
    expect(calls.some((c) => c.method === 'actualizar')).toBe(true);
  });

  it('COMUNICADOR edita en PENDIENTE -> BadRequestError', async () => {
    const { repo } = makeRepo(makeComunicado({ autorId: 'uuid-c', estado: 'PENDIENTE' }));
    const uc = new EditarComunicado(repo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeComComunicador('uuid-c', 5), 'com-id', { titulo: 'x' }),
    ).rejects.toThrow(BadRequestError);
  });

  it('COMUNICADOR edita en ARCHIVADO -> BadRequestError', async () => {
    const { repo } = makeRepo(makeComunicado({ autorId: 'uuid-c', estado: 'ARCHIVADO' }));
    const uc = new EditarComunicado(repo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeComComunicador('uuid-c', 5), 'com-id', { titulo: 'x' }),
    ).rejects.toThrow(BadRequestError);
  });

  it('COMUNICADOR edita comunicado ajeno -> ForbiddenError', async () => {
    const { repo } = makeRepo(makeComunicado({ autorId: 'uuid-other', estado: 'BORRADOR' }));
    const uc = new EditarComunicado(repo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeComComunicador('uuid-c', 5), 'com-id', { titulo: 'x' }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('ADMIN edita cualquier comunicado', async () => {
    const { repo, calls } = makeRepo(makeComunicado({ autorId: 'uuid-other', estado: 'BORRADOR' }));
    const uc = new EditarComunicado(repo, makeUnitOfWork());
    await uc.ejecutar(makeAdminClaims(), 'com-id', { titulo: 'x' });
    expect(calls.some((c) => c.method === 'actualizar')).toBe(true);
  });

  it('COMUNICADOR cambia audiencia a otro decanato -> BadRequestError', async () => {
    const { repo } = makeRepo(makeComunicado({ autorId: 'uuid-c', estado: 'BORRADOR', decanatoIds: [5] }));
    const uc = new EditarComunicado(repo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeComComunicador('uuid-c', 5), 'com-id', { decanatoIds: [3] }),
    ).rejects.toThrow(BadRequestError);
  });

  it('No existe -> NotFoundError', async () => {
    const { repo } = makeRepo(null);
    const uc = new EditarComunicado(repo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeComComunicador(), 'com-missing', { titulo: 'x' }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('SolicitarRevision', () => {
  it('Autor pasa de BORRADOR a PENDIENTE y limpia motivo de rechazo', async () => {
    const { repo, calls } = makeRepo(
      makeComunicado({ autorId: 'uuid-c', estado: 'BORRADOR', motivoRechazo: 'rechazo previo' }),
    );
    const uc = new SolicitarRevision(repo, makeUnitOfWork());
    const result = await uc.ejecutar(makeComComunicador('uuid-c', 5), 'com-id');
    const call = calls.find((c) => c.method === 'transicionarEstado');
    expect(call).toBeDefined();
    expect(result.estado).toBe('PENDIENTE');
  });

  it('Otro autor -> ForbiddenError', async () => {
    const { repo } = makeRepo(makeComunicado({ autorId: 'uuid-other', estado: 'BORRADOR' }));
    const uc = new SolicitarRevision(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeComComunicador('uuid-c', 5), 'com-id')).rejects.toThrow(ForbiddenError);
  });

  it('Estado != BORRADOR -> BadRequestError', async () => {
    const { repo } = makeRepo(makeComunicado({ autorId: 'uuid-c', estado: 'PUBLICADO' }));
    const uc = new SolicitarRevision(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeComComunicador('uuid-c', 5), 'com-id')).rejects.toThrow(BadRequestError);
  });
});

describe('AprobarComunicado', () => {
  it('ADMIN aprueba PENDIENTE -> PUBLICADO con aprobadoPor y publicadoAt', async () => {
    const { repo, calls } = makeRepo(makeComunicado({ autorId: 'uuid-other', estado: 'PENDIENTE' }));
    const uc = new AprobarComunicado(repo, makeUnitOfWork());
    const result = await uc.ejecutar(makeAdminClaims('uuid-a'), 'com-id', {});
    expect(result.estado).toBe('PUBLICADO');
    const call = calls.find((c) => c.method === 'transicionarEstado');
    expect(call).toBeDefined();
  });

  it('COMUNICADOR -> ForbiddenError', async () => {
    const { repo } = makeRepo(makeComunicado({ estado: 'PENDIENTE' }));
    const uc = new AprobarComunicado(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeComComunicador(), 'com-id', {})).rejects.toThrow(ForbiddenError);
  });

  it('ADMIN aprueba en BORRADOR -> BadRequestError', async () => {
    const { repo } = makeRepo(makeComunicado({ estado: 'BORRADOR' }));
    const uc = new AprobarComunicado(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeAdminClaims(), 'com-id', {})).rejects.toThrow(BadRequestError);
  });
});

describe('RechazarComunicado', () => {
  it('ADMIN rechaza PENDIENTE -> BORRADOR con motivo', async () => {
    const { repo } = makeRepo(makeComunicado({ autorId: 'uuid-c', estado: 'PENDIENTE' }));
    const uc = new RechazarComunicado(repo, makeUnitOfWork());
    const result = await uc.ejecutar(makeAdminClaims(), 'com-id', { motivo: 'no cumple' });
    expect(result.estado).toBe('BORRADOR');
    expect(result.motivoRechazo).toBe('no cumple');
  });

  it('COMUNICADOR -> ForbiddenError', async () => {
    const { repo } = makeRepo(makeComunicado({ estado: 'PENDIENTE' }));
    const uc = new RechazarComunicado(repo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeComComunicador(), 'com-id', { motivo: 'x' }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('ADMIN rechaza en BORRADOR -> BadRequestError', async () => {
    const { repo } = makeRepo(makeComunicado({ estado: 'BORRADOR' }));
    const uc = new RechazarComunicado(repo, makeUnitOfWork());
    await expect(
      uc.ejecutar(makeAdminClaims(), 'com-id', { motivo: 'x' }),
    ).rejects.toThrow(BadRequestError);
  });
});

describe('PublicarComunicado', () => {
  it('ADMIN publica BORRADOR directo -> PUBLICADO', async () => {
    const { repo } = makeRepo(makeComunicado({ estado: 'BORRADOR' }));
    const uc = new PublicarComunicado(repo, makeUnitOfWork());
    const result = await uc.ejecutar(makeAdminClaims('uuid-a'), 'com-id', {});
    expect(result.estado).toBe('PUBLICADO');
    expect(result.aprobadoPor).toBe('uuid-a');
  });

  it('COMUNICADOR -> ForbiddenError', async () => {
    const { repo } = makeRepo(makeComunicado({ estado: 'BORRADOR' }));
    const uc = new PublicarComunicado(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeComComunicador(), 'com-id', {})).rejects.toThrow(ForbiddenError);
  });

  it('ADMIN publica en PENDIENTE -> BadRequestError', async () => {
    const { repo } = makeRepo(makeComunicado({ estado: 'PENDIENTE' }));
    const uc = new PublicarComunicado(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeAdminClaims(), 'com-id', {})).rejects.toThrow(BadRequestError);
  });
});

describe('ArchivarComunicado', () => {
  it('Autor archiva su PUBLICADO', async () => {
    const { repo, calls } = makeRepo(makeComunicado({ autorId: 'uuid-c', estado: 'PUBLICADO' }));
    const uc = new ArchivarComunicado(repo, makeUnitOfWork());
    const result = await uc.ejecutar(makeComComunicador('uuid-c', 5), 'com-id');
    expect(result.estado).toBe('ARCHIVADO');
    expect(calls.some((c) => c.method === 'transicionarEstado')).toBe(true);
  });

  it('ADMIN archiva cualquier PUBLICADO', async () => {
    const { repo } = makeRepo(makeComunicado({ autorId: 'uuid-other', estado: 'PUBLICADO' }));
    const uc = new ArchivarComunicado(repo, makeUnitOfWork());
    const result = await uc.ejecutar(makeAdminClaims(), 'com-id');
    expect(result.estado).toBe('ARCHIVADO');
  });

  it('COMUNICADOR archiva comunicado ajeno -> ForbiddenError', async () => {
    const { repo } = makeRepo(makeComunicado({ autorId: 'uuid-other', estado: 'PUBLICADO' }));
    const uc = new ArchivarComunicado(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeComComunicador('uuid-c', 5), 'com-id')).rejects.toThrow(ForbiddenError);
  });

  it('Archivar en BORRADOR -> BadRequestError', async () => {
    const { repo } = makeRepo(makeComunicado({ autorId: 'uuid-c', estado: 'BORRADOR' }));
    const uc = new ArchivarComunicado(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeComComunicador('uuid-c', 5), 'com-id')).rejects.toThrow(BadRequestError);
  });
});

describe('EstadisticasComunicado', () => {
  it('Autor ve lecturas', async () => {
    const { repo } = makeRepo(makeComunicado({ autorId: 'uuid-c' }));
    const uc = new EstadisticasComunicado(repo, makeUnitOfWork());
    const result = await uc.ejecutar(makeComComunicador('uuid-c', 5), 'com-id');
    expect(result).toEqual({ lecturas: 0 });
  });

  it('ADMIN ve lecturas', async () => {
    const { repo } = makeRepo(makeComunicado({ autorId: 'uuid-other' }));
    const uc = new EstadisticasComunicado(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeAdminClaims(), 'com-id')).resolves.toEqual({ lecturas: 0 });
  });

  it('Otro COMUNICADOR -> ForbiddenError', async () => {
    const { repo } = makeRepo(makeComunicado({ autorId: 'uuid-other' }));
    const uc = new EstadisticasComunicado(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeComComunicador('uuid-c', 5), 'com-id')).rejects.toThrow(ForbiddenError);
  });
});

describe('ObtenerComunicado', () => {
  it('Autor obtiene su comunicado sin registrar lectura', async () => {
    const { repo, calls } = makeRepo(makeComunicado({ autorId: 'uuid-c', estado: 'BORRADOR' }));
    const uc = new ObtenerComunicado(repo, makeUnitOfWork());
    await uc.ejecutar(makeComComunicador('uuid-c', 5), 'com-id');
    expect(calls.some((c) => c.method === 'registrarLectura')).toBe(false);
  });

  it('No autor registra lectura y recibe el comunicado', async () => {
    const { repo, calls } = makeRepo(makeComunicado({ autorId: 'uuid-other', estado: 'PUBLICADO' }));
    const uc = new ObtenerComunicado(repo, makeUnitOfWork());
    const result = await uc.ejecutar(makeComComunicador('uuid-c', 5), 'com-id');
    expect(result.id).toBe('com-id');
    expect(calls.some((c) => c.method === 'registrarLectura')).toBe(true);
  });

  it('No existe -> NotFoundError', async () => {
    const { repo } = makeRepo(null);
    const uc = new ObtenerComunicado(repo, makeUnitOfWork());
    await expect(uc.ejecutar(makeComComunicador(), 'com-missing')).rejects.toThrow(NotFoundError);
  });
});

describe('ListarComunicados', () => {
  it('delega al repo con los filtros recibidos', async () => {
    const { repo, calls } = makeRepo(makeComunicado({ estado: 'PUBLICADO' }));
    const uc = new ListarComunicados(repo, makeUnitOfWork());
    const result = await uc.ejecutar(makeComComunicador(), { estado: 'PUBLICADO', limit: 10, offset: 0 });
    expect(result.length).toBe(1);
    expect(calls[0]?.method).toBe('listar');
  });

  it('sin filtro de estado, delega con filtro parcial', async () => {
    const { repo, calls } = makeRepo();
    const uc = new ListarComunicados(repo, makeUnitOfWork());
    await uc.ejecutar(makeComComunicador(), { limit: 5, offset: 0 });
    expect(calls[0]?.method).toBe('listar');
  });
});
