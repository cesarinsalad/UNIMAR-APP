import { Router, type Request } from 'express';
import { BadRequestError } from '../../../shared/errors';
import { asyncHandler, authenticate, parseBody } from '../../../shared/http/middlewares';
import type { AuthRequest } from '../../../shared/http/middlewares';
import type { IJwtService } from '../../../shared/security/jwt';
import type { RegistrarDispositivo } from '../application/registrarDispositivo';
import type { ListarDispositivos } from '../application/listarDispositivos';
import type { EliminarDispositivo } from '../application/eliminarDispositivo';
import { registrarDispositivoSchema, uuidParamSchema } from './schemas';

// Capa HTTP del componente Notificaciones (endpoints de /dispositivos).
// Las rutas solo "traducen" requests a llamadas de los casos de uso: validan
// el body con Zod en el borde (fail-fast), inyectan los claims via
// `authenticate` y devuelven la respuesta en el envoltorio estándar { data }.
// Sin lógica de negocio aquí; la visibilidad de filas la decide RLS en la DB.

function getParamId(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

function parseId(raw: string | undefined): string {
  const result = uuidParamSchema.safeParse(raw);
  if (!result.success) {
    throw new BadRequestError('ID de dispositivo inválido');
  }
  return result.data;
}

function requireAuth(req: Request): AuthRequest['auth'] {
  return (req as AuthRequest).auth;
}

export interface DispositivosRoutesDeps {
  jwtService: IJwtService;
  registrar: RegistrarDispositivo;
  listar: ListarDispositivos;
  eliminar: EliminarDispositivo;
}

export function dispositivosRoutes(deps: DispositivosRoutesDeps): Router {
  const router = Router();

  router.use(authenticate(deps.jwtService));

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const body = parseBody(registrarDispositivoSchema, req.body);
      const result = await deps.registrar.ejecutar(requireAuth(req)!, {
        pushToken: body.push_token,
        plataforma: body.plataforma,
      });
      res.status(201).json({ data: result });
    }),
  );

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const result = await deps.listar.ejecutar(requireAuth(req)!);
      res.json({ data: result });
    }),
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseId(getParamId(req.params.id));
      await deps.eliminar.ejecutar(requireAuth(req)!, id);
      res.status(204).send();
    }),
  );

  return router;
}
