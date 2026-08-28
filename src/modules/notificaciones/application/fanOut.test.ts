// Tests unitarios de los handlers de fan-out (sin base de datos ni red).
// Se usan mocks de repositorios, UnitOfWork e IPushService. El `evento.tx` es un
// objeto con `query` que emula el resultado de `resolveDestinatarios` (usuarios
// y sus decanatos), y `uow.run` emula la resolución de tokens post-COMMIT.

import { describe, expect, it, vi } from 'vitest';
import type { DbTx } from '../../../shared/kernel/db';
import type { UnitOfWork } from '../../../shared/kernel/unitOfWork';
import type { INotificacionRepository, IDispositivoRepository, IPushService, PushMensaje } from '../domain/ports';
import { FanOutComunicadoPublicado } from './fanOutComunicadoPublicado';
import { FanOutComunicadoRechazado } from './fanOutComunicadoRechazado';

interface UsuarioFake {
  id: string;
  decanatoId: number | null;
}

function makeTx(usuarios: UsuarioFake[]): DbTx {
  const query = async (sql: string, params: unknown[]) => {
    const autorId = params[0] as string;
    if (sql.includes('decanato_id = ANY')) {
      const decanatos = params[1] as number[];
      const rows = usuarios
        .filter((u) => u.id !== autorId && u.decanatoId !== null && decanatos.includes(u.decanatoId))
        .map((u) => ({ id: u.id }));
      return { rows };
    }
    if (sql.includes('FROM usuarios')) {
      const rows = usuarios.filter((u) => u.id !== autorId).map((u) => ({ id: u.id }));
      return { rows };
    }
    return { rows: [] };
  };
  return { query } as unknown as DbTx;
}

function makeNotifRepo() {
  const crearMasivo = vi.fn();
  return {
    crearMasivo,
    repo: {
      crearMasivo: async (...args: unknown[]) => {
        crearMasivo(...args);
      },
    } as unknown as INotificacionRepository,
  };
}

function makeDispRepo(tokens: Record<string, string[]>) {
  const tokensDeUsuarios = vi.fn(async (_tx: DbTx, usuarioIds: string[]) =>
    usuarioIds.flatMap((id) => tokens[id] ?? []),
  );
  return {
    tokensDeUsuarios,
    repo: { tokensDeUsuarios } as unknown as IDispositivoRepository,
  };
}

function makePush() {
  const enviar = vi.fn(async (_mensajes: PushMensaje[]) => {});
  return { enviar, service: { enviar } as unknown as IPushService };
}

function makeUow() {
  return {
    run: async <T>(fn: (tx: DbTx) => Promise<T>) => fn({} as DbTx),
  } as unknown as UnitOfWork;
}

const autores = {
  comId: 'com-id',
  autorId: 'autor-1',
};

describe('FanOutComunicadoPublicado', () => {
  it('GLOBAL: excluye al autor e inserta masivamente para todos los demás', async () => {
    const usuarios: UsuarioFake[] = [
      { id: 'autor-1', decanatoId: 5 },
      { id: 'u2', decanatoId: 5 },
      { id: 'u3', decanatoId: null },
    ];
    const { crearMasivo, repo } = makeNotifRepo();
    const { repo: dispRepo } = makeDispRepo({});
    const { service: push } = makePush();

    const handler = new FanOutComunicadoPublicado(repo, dispRepo, push, makeUow());
    await handler.manejar({
      tipo: 'COMUNICADO_PUBLICADO',
      tx: makeTx(usuarios),
      comunicadoId: autores.comId,
      titulo: 'Titulo',
      autorId: autores.autorId,
      decanatoIds: [],
    });

    expect(crearMasivo).toHaveBeenCalledOnce();
    const args = crearMasivo.mock.calls[0]![1] as unknown as {
      usuarioIds: string[];
      tipo: string;
      referenciaId: string;
    };
    expect(args.usuarioIds.sort()).toEqual(['u2', 'u3']);
    expect(args.tipo).toBe('COMUNICADO_PUBLICADO');
    expect(args.referenciaId).toBe('com-id');
  });

  it('audiencia: filtra por decanato y excluye al autor', async () => {
    const usuarios: UsuarioFake[] = [
      { id: 'autor-1', decanatoId: 5 },
      { id: 'u2', decanatoId: 5 },
      { id: 'u3', decanatoId: 3 },
      { id: 'u4', decanatoId: null },
    ];
    const { crearMasivo, repo } = makeNotifRepo();
    const { repo: dispRepo } = makeDispRepo({});
    const { service: push } = makePush();

    const handler = new FanOutComunicadoPublicado(repo, dispRepo, push, makeUow());
    await handler.manejar({
      tipo: 'COMUNICADO_PUBLICADO',
      tx: makeTx(usuarios),
      comunicadoId: 'com-id',
      titulo: 'Titulo',
      autorId: 'autor-1',
      decanatoIds: [5],
    });

    const args = crearMasivo.mock.calls[0]![1] as unknown as { usuarioIds: string[] };
    expect(args.usuarioIds).toEqual(['u2']);
  });

  it('sin destinatarios: no inserta y no devuelve job', async () => {
    const usuarios: UsuarioFake[] = [{ id: 'autor-1', decanatoId: 5 }];
    const { crearMasivo, repo } = makeNotifRepo();
    const { repo: dispRepo } = makeDispRepo({});
    const { service: push } = makePush();

    const handler = new FanOutComunicadoPublicado(repo, dispRepo, push, makeUow());
    const job = await handler.manejar({
      tipo: 'COMUNICADO_PUBLICADO',
      tx: makeTx(usuarios),
      comunicadoId: 'com-id',
      titulo: 'Titulo',
      autorId: 'autor-1',
      decanatoIds: [],
    });

    expect(crearMasivo).not.toHaveBeenCalled();
    expect(job).toBeNull();
  });

  it('job post-COMMIT: resuelve tokens y envía un push por token con data deep-link', async () => {
    const usuarios: UsuarioFake[] = [
      { id: 'autor-1', decanatoId: 5 },
      { id: 'u2', decanatoId: 5 },
    ];
    const tokens: Record<string, string[]> = { u2: ['tok-1', 'tok-2'] };
    const { repo } = makeNotifRepo();
    const { repo: dispRepo, tokensDeUsuarios } = makeDispRepo(tokens);
    const { enviar, service: push } = makePush();

    const handler = new FanOutComunicadoPublicado(repo, dispRepo, push, makeUow());
    const job = await handler.manejar({
      tipo: 'COMUNICADO_PUBLICADO',
      tx: makeTx(usuarios),
      comunicadoId: 'com-id',
      titulo: 'Titulo',
      autorId: 'autor-1',
      decanatoIds: [],
    });

    expect(job).not.toBeNull();
    await job!();

    expect(tokensDeUsuarios).toHaveBeenCalledWith(expect.anything(), ['u2']);
    expect(enviar).toHaveBeenCalledOnce();
    const mensajes = enviar.mock.calls[0]![0] as PushMensaje[];
    expect(mensajes.map((m) => m.to)).toEqual(['tok-1', 'tok-2']);
    expect(mensajes[0]).toMatchObject({
      title: 'Nuevo comunicado publicado',
      body: 'Titulo',
      data: { tipo: 'COMUNICADO_PUBLICADO', referencia_id: 'com-id' },
    });
  });

  it('job post-COMMIT: sin tokens no llama a push', async () => {
    const usuarios: UsuarioFake[] = [
      { id: 'autor-1', decanatoId: 5 },
      { id: 'u2', decanatoId: 5 },
    ];
    const { repo } = makeNotifRepo();
    const { repo: dispRepo } = makeDispRepo({});
    const { enviar, service: push } = makePush();

    const handler = new FanOutComunicadoPublicado(repo, dispRepo, push, makeUow());
    const job = await handler.manejar({
      tipo: 'COMUNICADO_PUBLICADO',
      tx: makeTx(usuarios),
      comunicadoId: 'com-id',
      titulo: 'Titulo',
      autorId: 'autor-1',
      decanatoIds: [],
    });

    await job!();
    expect(enviar).not.toHaveBeenCalled();
  });
});

describe('FanOutComunicadoRechazado', () => {
  it('inserta una sola notificación al autor con el motivo', async () => {
    const { crearMasivo, repo } = makeNotifRepo();
    const { repo: dispRepo } = makeDispRepo({});
    const { service: push } = makePush();

    const handler = new FanOutComunicadoRechazado(repo, dispRepo, push, makeUow());
    await handler.manejar({
      tipo: 'COMUNICADO_RECHAZADO',
      tx: {} as DbTx,
      comunicadoId: 'com-id',
      titulo: 'Titulo',
      autorId: 'autor-1',
      motivo: 'ajusta el título',
    });

    expect(crearMasivo).toHaveBeenCalledOnce();
    const args = crearMasivo.mock.calls[0]![1] as unknown as {
      usuarioIds: string[];
      tipo: string;
      cuerpo: string;
    };
    expect(args.usuarioIds).toEqual(['autor-1']);
    expect(args.tipo).toBe('COMUNICADO_RECHAZADO');
    expect(args.cuerpo).toBe('ajusta el título');
  });

  it('envía push solo a los dispositivos del autor', async () => {
    const tokens: Record<string, string[]> = { 'autor-1': ['tok-a'] };
    const { repo } = makeNotifRepo();
    const { repo: dispRepo } = makeDispRepo(tokens);
    const { enviar, service: push } = makePush();

    const handler = new FanOutComunicadoRechazado(repo, dispRepo, push, makeUow());
    const job = await handler.manejar({
      tipo: 'COMUNICADO_RECHAZADO',
      tx: {} as DbTx,
      comunicadoId: 'com-id',
      titulo: 'Titulo',
      autorId: 'autor-1',
      motivo: 'ajusta el título',
    });

    await job!();
    const mensajes = enviar.mock.calls[0]![0] as PushMensaje[];
    expect(mensajes.map((m) => m.to)).toEqual(['tok-a']);
    expect(mensajes[0]).toMatchObject({
      title: 'Comunicado rechazado',
      body: 'ajusta el título',
      data: { tipo: 'COMUNICADO_RECHAZADO', referencia_id: 'com-id' },
    });
  });
});
