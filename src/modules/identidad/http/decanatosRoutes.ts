import { Router } from 'express';
import { asyncHandler, authenticate } from '../../../shared/http/middlewares';
import type { AuthRequest } from '../../../shared/http/middlewares';
import type { IJwtService } from '../../../shared/security/jwt';
import type { ListarDecanatos } from '../application/listarDecanatos';

// Capa HTTP del módulo de identidad (catálogo de decanatos). Requiere JWT
// como el resto de rutas de negocio; devuelve el envoltorio estándar { data }.

export interface DecanatosRoutesDeps {
  jwtService: IJwtService;
  listar: ListarDecanatos;
}

export function decanatosRouter(deps: DecanatosRoutesDeps): Router {
  const router = Router();

  router.use(authenticate(deps.jwtService));

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const result = await deps.listar.ejecutar((req as AuthRequest).auth!);
      res.json({ data: result });
    }),
  );

  return router;
}