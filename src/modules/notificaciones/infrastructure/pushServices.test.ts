// Tests unitarios de los adaptadores de push (ExpoPushService y MockPushService).
// Para ExpoPushService se inyecta un `fetchImpl` fake y un `chunkSize` pequeño;
// así se verifica el batching y el manejo best-effort de errores sin red real.

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ExpoPushService, MockPushService } from './pushServices';
import type { PushMensaje } from '../domain/ports';

type FakeFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function makeMensajes(n: number): PushMensaje[] {
  return Array.from({ length: n }, (_, i) => ({
    to: `ExpoPushToken[${i}]`,
    title: `Titulo ${i}`,
    body: `Cuerpo ${i}`,
    data: { tipo: 'COMUNICADO_PUBLICADO', referencia_id: `com-${i}` },
  }));
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ExpoPushService', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('cero mensajes no hace requests', async () => {
    const calls: { input: string | URL | Request; init?: RequestInit }[] = [];
    const fetchImpl: FakeFetch = async (input, init) => {
      calls.push({ input, init });
      return jsonResponse({ data: [] });
    };
    const svc = new ExpoPushService({ fetchImpl });
    await svc.enviar([]);
    expect(calls).toHaveLength(0);
  });

  it('agrupa en lotes de 100 (250 mensajes → 3 requests)', async () => {
    const calls: { input: string | URL | Request; init?: RequestInit }[] = [];
    const fetchImpl: FakeFetch = async (input, init) => {
      calls.push({ input, init });
      return jsonResponse({ data: [] });
    };
    const svc = new ExpoPushService({ fetchImpl });
    await svc.enviar(makeMensajes(250));
    expect(calls).toHaveLength(3);

    const tamanos = calls.map((c) => JSON.parse(c.init!.body as string).length);
    expect(tamanos).toEqual([100, 100, 50]);
  });

  it('envía el payload con to/title/body/sound/data', async () => {
    let body: unknown;
    const fetchImpl: FakeFetch = async (_input, init) => {
      body = JSON.parse(init!.body as string);
      return jsonResponse({ data: [] });
    };
    const svc = new ExpoPushService({ fetchImpl, chunkSize: 10 });
    await svc.enviar([
      { to: 'tok', title: 'T', body: 'B', data: { tipo: 'COMUNICADO_PUBLICADO' } },
    ]);

    const arr = body as Array<Record<string, unknown>>;
    expect(arr[0]).toMatchObject({
      to: 'tok',
      title: 'T',
      body: 'B',
      sound: 'default',
      data: { tipo: 'COMUNICADO_PUBLICADO' },
    });
  });

  it('fallo de red no lanza (best-effort)', async () => {
    const fetchImpl: FakeFetch = async () => {
      throw new Error('ECONNREFUSED');
    };
    const svc = new ExpoPushService({ fetchImpl });
    await expect(svc.enviar(makeMensajes(1))).resolves.toBeUndefined();
  });

  it('HTTP no exitoso no lanza', async () => {
    const fetchImpl: FakeFetch = async () => new Response('', { status: 500 });
    const svc = new ExpoPushService({ fetchImpl });
    await expect(svc.enviar(makeMensajes(1))).resolves.toBeUndefined();
  });

  it('respuesta no-JSON no lanza', async () => {
    const fetchImpl: FakeFetch = async () =>
      new Response('no es json', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    const svc = new ExpoPushService({ fetchImpl });
    await expect(svc.enviar(makeMensajes(1))).resolves.toBeUndefined();
  });

  it('tickets con error solo se loguean (no lanzan ni borran tokens)', async () => {
    const warn = vi.fn();
    vi.spyOn(console, 'warn').mockImplementation(warn);

    const fetchImpl: FakeFetch = async () =>
      jsonResponse({
        data: [
          { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } },
        ],
      });
    const svc = new ExpoPushService({ fetchImpl });
    await expect(svc.enviar(makeMensajes(1))).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });
});

describe('MockPushService', () => {
  it('no hace red y acepta mensajes vacíos', async () => {
    const log = vi.fn();
    vi.spyOn(console, 'log').mockImplementation(log);

    const svc = new MockPushService();
    await expect(svc.enviar([])).resolves.toBeUndefined();
    expect(log).not.toHaveBeenCalled();

    await expect(svc.enviar(makeMensajes(2))).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });
});
