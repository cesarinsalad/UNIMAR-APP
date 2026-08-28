// Tests de los hooks de eventos de Comunicaciones.
// Verifican que AprobarComunicado, PublicarComunicado y RechazarComunicado
// emiten el evento correcto DENTRO de la transacción y ejecutan los jobs de
// push (post-COMMIT) SOLO si la transacción se resolvió con éxito.

import { describe, expect, it } from 'vitest';
import type { DbTx } from '../../../shared/kernel/db';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { Claims } from '../../../shared/security/jwt';
import type { IComunicadoRepository } from '../domain/ports';
import type { Comunicado } from '../domain/comunicado';
import { EventBus } from '../../../shared/kernel/eventos';
import type { EventoComunicadoPublicado, EventoComunicadoRechazado } from '../../../shared/kernel/eventos';
import { AprobarComunicado } from './aprobarComunicado';
import { PublicarComunicado } from './publicarComunicado';
import { RechazarComunicado } from './rechazarComunicado';

const fakeTx = {} as DbTx;

function makeAdminClaims(): Claims {
  return { sub: 'uuid-admin', role: 'ADMIN', decanato_id: null, nombre: 'Admin' };
}

function makeComunicado(overrides: Partial<Comunicado> = {}): Comunicado {
  return {
    id: 'com-id',
    titulo: 'Titulo',
    cuerpo: 'c',
    autorId: 'uuid-com',
    estado: 'BORRADOR',
    aprobadoPor: null,
    motivoRechazo: null,
    publicadoAt: null,
    programadoPara: null,
    expiraAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    decanatoIds: [],
    ...overrides,
  };
}

function makeRepo(estadoInicial: Comunicado['estado']): IComunicadoRepository {
  let store = makeComunicado({ estado: estadoInicial });
  return {
    crear: async () => store,
    agregarAudiencias: async () => {},
    buscarPorId: async () => store,
    listar: async () => [store],
    actualizar: async () => store,
    transicionarEstado: async (_tx, _id, input) => {
      store = { ...store, ...input } as Comunicado;
      return store;
    },
    registrarLectura: async () => {},
    contarLecturas: async () => 0,
  };
}

// Fake UnitOfWork que controla cuándo "commitea" y si falla.
function makeControlledUow(opts: { failOnCommit?: boolean } = {}) {
  let committed = false;
  const uow = {
    runAs: async <T>(_claims: Record<string, unknown>, fn: (tx: DbTx) => Promise<T>): Promise<T> => {
      const result = await fn(fakeTx);
      if (opts.failOnCommit) {
        throw new Error('rollback simulado');
      }
      committed = true;
      return result;
    },
  } as unknown as UnitOfWork;
  return { uow, wasCommitted: () => committed };
}

describe('hooks de eventos en Comunicaciones', () => {
  it('AprobarComunicado publica COMUNICADO_PUBLICADO y ejecuta el job post-commit', async () => {
    const bus = new EventBus();
    const eventos: EventoComunicadoPublicado[] = [];
    let jobRan = false;
    bus.suscribir('COMUNICADO_PUBLICADO', async (e) => {
      eventos.push(e);
      return async () => {
        jobRan = true;
      };
    });

    const { uow } = makeControlledUow();
    const uc = new AprobarComunicado(makeRepo('PENDIENTE'), uow, bus);
    await uc.ejecutar(makeAdminClaims(), 'com-id', {});

    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      tipo: 'COMUNICADO_PUBLICADO',
      comunicadoId: 'com-id',
      decanatoIds: [],
    });
    expect(jobRan).toBe(true);
  });

  it('PublicarComunicado publica COMUNICADO_PUBLICADO', async () => {
    const bus = new EventBus();
    let publicado = false;
    bus.suscribir('COMUNICADO_PUBLICADO', async () => {
      publicado = true;
      return null;
    });

    const { uow } = makeControlledUow();
    const uc = new PublicarComunicado(makeRepo('BORRADOR'), uow, bus);
    await uc.ejecutar(makeAdminClaims(), 'com-id', {});

    expect(publicado).toBe(true);
  });

  it('RechazarComunicado publica COMUNICADO_RECHAZADO con el motivo', async () => {
    const bus = new EventBus();
    const eventos: EventoComunicadoRechazado[] = [];
    bus.suscribir('COMUNICADO_RECHAZADO', async (e) => {
      eventos.push(e);
      return null;
    });

    const { uow } = makeControlledUow();
    const uc = new RechazarComunicado(makeRepo('PENDIENTE'), uow, bus);
    await uc.ejecutar(makeAdminClaims(), 'com-id', { motivo: 'ajusta el título' });

    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      tipo: 'COMUNICADO_RECHAZADO',
      motivo: 'ajusta el título',
      autorId: 'uuid-com',
    });
  });

  it('si la transacción hace rollback, los jobs post-commit NO se ejecutan', async () => {
    const bus = new EventBus();
    let jobRan = false;
    bus.suscribir('COMUNICADO_PUBLICADO', async () => {
      return async () => {
        jobRan = true;
      };
    });

    const { uow } = makeControlledUow({ failOnCommit: true });
    const uc = new AprobarComunicado(makeRepo('PENDIENTE'), uow, bus);

    await expect(uc.ejecutar(makeAdminClaims(), 'com-id', {})).rejects.toThrow(
      'rollback simulado',
    );
    expect(jobRan).toBe(false);
  });

  it('un fallo en el job post-commit no revierte la publicación', async () => {
    const bus = new EventBus();
    bus.suscribir('COMUNICADO_PUBLICADO', async () => {
      return async () => {
        throw new Error('push caído');
      };
    });

    const { uow } = makeControlledUow();
    const uc = new AprobarComunicado(makeRepo('PENDIENTE'), uow, bus);
    const result = await uc.ejecutar(makeAdminClaims(), 'com-id', {});

    expect(result.estado).toBe('PUBLICADO');
  });

  it('sin EventBus inyectado conserva el comportamiento (no publica)', async () => {
    const { uow } = makeControlledUow();
    const uc = new AprobarComunicado(makeRepo('PENDIENTE'), uow);
    const result = await uc.ejecutar(makeAdminClaims(), 'com-id', {});
    expect(result.estado).toBe('PUBLICADO');
  });
});
