import express, { type Express, type NextFunction, type Router } from 'express';
import { NotFoundError } from './shared/errors';
import { errorHandler } from './shared/http/middlewares';
import { unitOfWorkMiddleware } from './shared/http/unitOfWorkMiddleware';
import type { IJwtService } from './shared/security/jwt';
import type { AuthService } from './modules/identidad';
import { authRouter } from './modules/identidad';
import type { UnitOfWork } from './shared/kernel/unitOfWork';

export interface AppDeps {
  authService: AuthService;
  jwtService: IJwtService;
  uow: UnitOfWork;
  comunicacionesRouter: Router;
  notificacionesRouter: Router;
}

/**
 * Fábrica de la aplicación Express.
 *
 * Recibe dependencias por parámetro para poder testear sin levantar servidor
 * (Clean Architecture: la app es independiente del runtime de conexión).
 */
export function createApp(deps: AppDeps): Express {
  const app = express();

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Inyecta req.db.{run, runAsUser} para los endpoints protegidos futuros.
  // No requiere autenticación aquí; runAsUser verifica req.auth internamente.
  app.use((req, res, next) => unitOfWorkMiddleware(deps.uow)(req, res, next));

  app.use('/api/v1/auth', authRouter(deps.authService));
  app.use('/api/v1', deps.comunicacionesRouter);
  app.use('/api/v1', deps.notificacionesRouter);

  // 404 para rutas desconocidas
  app.use((_req, _res, next: NextFunction) => {
    next(new NotFoundError('Ruta no encontrada'));
  });

  app.use(errorHandler);

  return app;
}

