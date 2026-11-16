import { describe, expect, it, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { errorHandler } from './middlewares';
import { storageGateway, type FetchLike } from './storageGateway';

const SUPABASE = 'http://127.0.0.1:54321';
const SUBIDA =
  '/storage/v1/object/upload/sign/comunicado-adjuntos/abc/portada.jpg?token=firma';

function buildApp(fetchImpl: FetchLike, limit = '6mb'): Express {
  const app = express();
  app.use(
    '/storage/v1',
    express.raw({ type: '*/*', limit }),
    storageGateway({ supabaseUrl: SUPABASE, fetchImpl }),
  );
  app.use(errorHandler);
  return app;
}

describe('storageGateway', () => {
  it('reenvía la subida a Supabase Storage y devuelve la respuesta', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () =>
      new Response('ok', {
        status: 200,
        headers: { 'content-type': 'image/jpeg', 'cache-control': 'max-age=3600' },
      }),
    );

    const res = await request(buildApp(fetchImpl))
      .put(SUBIDA)
      .set('Content-Type', 'image/jpeg')
      .set('x-upsert', 'true')
      .set('Authorization', 'Bearer secreto-del-bff')
      .send(Buffer.from('bytes'));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/jpeg');

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(`${SUPABASE}${SUBIDA}`);
    expect(init.method).toBe('PUT');

    const headers = init.headers as Record<string, string>;
    expect(headers['content-type']).toBe('image/jpeg');
    expect(headers['x-upsert']).toBe('true');
    // El service-role nunca se filtra al cliente.
    expect(headers['authorization']).toBeUndefined();

    expect(new TextDecoder().decode(init.body as Uint8Array)).toBe('bytes');
  });

  it('reenvía descargas GET con el token de la URL', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () =>
      new Response('imagen', { status: 200, headers: { 'content-type': 'image/png' } }),
    );

    const destino =
      '/storage/v1/object/sign/comunicado-adjuntos/abc/portada.png?token=firma';
    const res = await request(buildApp(fetchImpl)).get(destino);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/png');
    expect(Buffer.from(res.body as Buffer).toString()).toBe('imagen');
    expect(fetchImpl.mock.calls[0]![0]).toBe(`${SUPABASE}${destino}`);
    expect(fetchImpl.mock.calls[0]![1].body).toBeUndefined();
  });

  it('rechaza sin token y no toca Storage', async () => {
    const fetchImpl = vi.fn<FetchLike>();
    const res = await request(buildApp(fetchImpl)).put(
      '/storage/v1/object/upload/sign/comunicado-adjuntos/abc/portada.jpg',
    );

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rechaza métodos fuera de la allowlist', async () => {
    const fetchImpl = vi.fn<FetchLike>();
    const res = await request(buildApp(fetchImpl)).delete(SUBIDA);

    expect(res.status).toBe(405);
    expect(res.headers.allow).toBe('GET, HEAD, PUT, POST');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('traduce un cuerpo demasiado grande a 413', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => new Response('ok', { status: 200 }));
    const res = await request(buildApp(fetchImpl, '1kb'))
      .put(SUBIDA)
      .set('Content-Type', 'image/jpeg')
      .send(Buffer.alloc(4 * 1024, 1));

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
