import { Router, type Request } from 'express';
import { BadRequestError } from '../../../shared/errors';
import { asyncHandler, authenticate, parseBody } from '../../../shared/http/middlewares';
import type { AuthRequest } from '../../../shared/http/middlewares';
import type { IJwtService } from '../../../shared/security/jwt';
import type { ListarNotificaciones } from '../application/listarNotificaciones';
import type { ContarNotificacionesNoLeidas } from '../application/contarNotificacionesNoLeidas';
import type { MarcarNotificacionLeida } from '../application/marcarNotificacionLeida';
import type { MarcarTodasLeidas } from '../application/marcarTodasLeidas';
import { listarNotificacionesQuerySchema, uuidParamSchema } from './schemas';

// Capa HTTP del componente Notificaciones (endpoints de /notificaciones).
// Bandeja in-app del usuario autenticado. RLS garantiza que solo vea sus
// propias filas; aquí solo validamos el body/query y devolvemos { data }.

function getParamId(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

function parseId(raw: string | undefined): string {
  const result = uuidParamSchema.safeParse(raw);
  if (!result.success) {
    throw new BadRequestError('ID de notificación inválido');
  }
  return result.data;
}

function requireAuth(req: Request): AuthRequest['auth'] {
  return (req as AuthRequest).auth;
}

export interface NotificacionesRoutesDeps {
  jwtService: IJwtService;
  listar: ListarNotificaciones;
  contarNoLeidas: ContarNotificacionesNoLeidas;
  marcarLeida: MarcarNotificacionLeida;
  marcarTodasLeidas: MarcarTodasLeidas;
}

export function notificacionesRoutes(deps: NotificacionesRoutesDeps): Router {
  const router = Router();

  router.use(authenticate(deps.jwtService));

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const query = parseBody(listarNotificacionesQuerySchema, req.query);
      const result = await deps.listar.ejecutar(requireAuth(req)!, {
        soloNoLeidas: query.solo_no_leidas,
        limit: query.limit,
        offset: query.offset,
      });
      res.json({ data: result });
    }),
  );

  router.get(
    '/no-leidas',
    asyncHandler(async (req, res) => {
      const result = await deps.contarNoLeidas.ejecutar(requireAuth(req)!);
      res.json({ data: result });
    }),
  );

  router.post(
    '/:id/leer',
    asyncHandler(async (req, res) => {
      const id = parseId(getParamId(req.params.id));
      const result = await deps.marcarLeida.ejecutar(requireAuth(req)!, id);
      res.json({ data: result });
    }),
  );

  router.post(
    '/leer-todas',
    asyncHandler(async (req, res) => {
      const result = await deps.marcarTodasLeidas.ejecutar(requireAuth(req)!);
      res.json({ data: result });
    }),
  );

  return router;
}
