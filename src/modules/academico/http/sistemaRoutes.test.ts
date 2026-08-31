// Tests unitarios del endpoint de sistema (API Key, no JWT).
// Verifica que el middleware rechaza sin header, con header incorrecto, y
// acepta con la key correcta.

import { describe, expect, it } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { errorHandler } from '../../../shared/http/middlewares';
import { sistemaRoutes } from './sistemaRoutes';

const API_KEY = 'test-system-key';
const PATH = '/sistema/notas';

function buildApp(publicarNota?: () => Promise<unknown>): Express {
  const app = express();
  app.use(express.json());
  app.use(
    '/sistema',
    sistemaRoutes(
      {
        publicarNota: {
          ejecutar: async () => {
            if (publicarNota) await publicarNota();
            return { usuarioId: 'uuid-x' };
          },
        } as unknown as Parameters<typeof sistemaRoutes>[0]['publicarNota'],
      },
      API_KEY,
    ),
  );
  app.use(errorHandler);
  return app;
}

describe('sistemaRoutes (API Key)', () => {
  it('rechaza sin header X-API-Key', async () => {
    const app = buildApp();
    const res = await request(app).post(PATH).send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rechaza con header X-API-Key incorrecto', async () => {
    const app = buildApp();
    const res = await request(app)
      .post(PATH)
      .set('X-API-Key', 'wrong')
      .send({});
    expect(res.status).toBe(401);
  });

  it('acepta con la API Key correcta', async () => {
    let llamado = false;
    const app = buildApp(() => {
      llamado = true;
      return Promise.resolve();
    });
    const res = await request(app)
      .post(PATH)
      .set('X-API-Key', API_KEY)
      .send({
        materia_id: 'mat-1',
        materia_nombre: 'BD',
        cedula_estudiante: '20123456',
        nota: 18,
        periodo: '2026-1',
      });
    expect(res.status).toBe(202);
    expect(llamado).toBe(true);
  });

  it('rechaza body inválido antes de llamar al caso de uso', async () => {
    let llamado = false;
    const app = buildApp(() => {
      llamado = true;
      return Promise.resolve();
    });
    const res = await request(app)
      .post(PATH)
      .set('X-API-Key', API_KEY)
      .send({ nota: 999 }); // fuera de rango
    expect(res.status).toBe(400);
    expect(llamado).toBe(false);
  });
});
