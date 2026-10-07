// Test de COMPOSICIÓN (nivel módulo): monta los routers exactamente como
// lo hace app.ts (app.use('/api/v1', academicoRouter) + sistemaRouter) y
// verifica las rutas EN SU PATH PÚBLICO. Existe porque el bug del rebote
// post-login (06 oct 2026) fue un montaje SIN prefijo que ninguna prueba
// de archivo individual detectaba: academicoRoutes pasa a vivir en
// /api/v1/academico/* (como consume el móvil y los deep-links) y las
// rutas de sistema en /api/v1/sistema/notas (como declara el contrato).
import { describe, expect, it } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import type { DbTx } from '../../shared/kernel/db';
import type { UnitOfWork } from '../../shared/kernel/unitOfWork';
import { JwtService } from '../../shared/security/jwt';
import { errorHandler } from '../../shared/http/middlewares';
import type { MateriaDTO } from './domain/dtos';
import { createAcademicoModule } from './index';

const SECRET = 'test-secret';
const API_KEY = 'test-system-key';

function makeMaterias(): MateriaDTO[] {
  return [
    {
      id: 'mat-1',
      codigo: 'IS-701',
      nombre: 'Bases de Datos II',
      creditos: 4,
      es_actual: true,
      profesor: 'Dra. Pérez',
      aula: 'A-12',
      horario: 'Lun-Mié 9:00-10:30',
      cortes: [],
    },
  ];
}

const fakeTx = {} as DbTx;
const fakeUow = {
  run: async <T>(fn: (tx: DbTx) => Promise<T>) => fn(fakeTx),
  runAs: async <T>(_claims: unknown, fn: (tx: DbTx) => Promise<T>) => fn(fakeTx),
} as unknown as UnitOfWork;

function buildApp(claimsForToken: Record<string, unknown>): {
  app: Express;
  token: string;
} {
  const jwtService = new JwtService(SECRET, '8h');
  const token = jwtService.sign({
    sub: 'uuid-est',
    role: 'ESTUDIANTE',
    decanato_id: 5,
    nombre: 'Ana Estudiante',
  } as never);
  void claimsForToken;

  const { router, sistemaRouter } = createAcademicoModule({
    uow: fakeUow,
    jwtService,
    academicService: {
      materias: async () => makeMaterias(),
    } as never,
    cedulaResolver: { obtenerCedula: async () => '20123456' } as never,
    usuarioIdResolver: {
      obtenerUsuarioIdPorCedula: async () => 'uuid-est',
    } as never,
    sistemaApiKey: API_KEY,
  });

  const app = express();
  app.use(express.json());
  app.use('/api/v1', router);
  app.use('/api/v1', sistemaRouter);
  app.use(errorHandler);
  return { app, token };
}

describe('composición académico (nivel módulo, paths públicos)', () => {
  it('GET /api/v1/academico/materias con JWT → 200 (regresión del rebote)', async () => {
    const { app, token } = buildApp({});
    const res = await request(app)
      .get('/api/v1/academico/materias')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]?.codigo).toBe('IS-701');
  });

  it('POST /api/v1/sistema/notas sin X-API-Key → 401 de API Key (ruta protegida correcta)', async () => {
    const { app } = buildApp({});
    const res = await request(app).post('/api/v1/sistema/notas').send({});
    expect(res.status).toBe(401);
    console.log('BODY:', JSON.stringify(res.body));
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/notas → 404 (la ruta colgante en la raíz ya no existe)', async () => {
    const { app } = buildApp({});
    const res = await request(app).post('/api/v1/notas').send({});
    expect(res.status).toBe(404);
  });

  it('GET /api/v1/academico/perfil sin token → 401 JWT (no 401 de API Key)', async () => {
    const { app } = buildApp({});
    const res = await request(app).get('/api/v1/academico/perfil');
    expect(res.status).toBe(401);
    expect((res.body.error?.message ?? '')).not.toContain('API Key');
  });
});
