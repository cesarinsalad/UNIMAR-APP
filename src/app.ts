import cors from 'cors';
import express, { type Express, type NextFunction, type Router } from 'express';
import { NotFoundError } from './shared/errors';
import { errorHandler } from './shared/http/middlewares';
import { unitOfWorkMiddleware } from './shared/http/unitOfWorkMiddleware';
import type { IJwtService } from './shared/security/jwt';
import type { AuthService } from './modules/identidad';
import { authRouter } from './modules/identidad';
import type { UnitOfWork } from './shared/kernel/unitOfWork';
import { env } from './config/env';

export interface AppDeps {
  authService: AuthService;
  jwtService: IJwtService;
  uow: UnitOfWork;
  decanatosRouter: Router;
  comunicacionesRouter: Router;
  notificacionesRouter: Router;
  calendarioRouter: Router;
  academicoRouter: Router;
  sistemaRouter: Router;
}

/**
 * Fábrica de la aplicación Express.
 *
 * Recibe dependencias por parámetro para poder testear sin levantar servidor
 * (Clean Architecture: la app es independiente del runtime de conexión).
 */
export function createApp(deps: AppDeps): Express {
  const app = express();

  // CORS para clientes web (navegador no nativo hace preflight cross-origin
  // contra este BFF). Va antes de json/UoW para que OPTIONS no pase por ahí.
  // Sin credentials: la app usa Bearer token en header, no cookies.
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
  app.use(cors({ origin: allowedOrigins, credentials: false }));

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Inyecta req.db.{run, runAsUser} para los endpoints protegidos futuros.
  // No requiere autenticación aquí; runAsUser verifica req.auth internamente.
  app.use((req, res, next) => unitOfWorkMiddleware(deps.uow)(req, res, next));

  app.use('/api/v1/auth', authRouter(deps.authService));
  app.use('/api/v1/decanatos', deps.decanatosRouter);
  app.use('/api/v1', deps.comunicacionesRouter);
  app.use('/api/v1', deps.notificacionesRouter);
  app.use('/api/v1', deps.calendarioRouter);
  app.use('/api/v1', deps.academicoRouter);
  app.use('/api/v1', deps.sistemaRouter);

  // 404 para rutas desconocidas
  app.use((_req, _res, next: NextFunction) => {
    next(new NotFoundError('Ruta no encontrada'));
  });

  app.use(errorHandler);

  return app;
}

