import { Router, type Request } from 'express';
import { BadRequestError } from '../../../shared/errors';
import { asyncHandler, authenticate, parseBody } from '../../../shared/http/middlewares';
import type { AuthRequest } from '../../../shared/http/middlewares';
import type { IJwtService } from '../../../shared/security/jwt';
import type { CrearEvento } from '../application/crearEvento';
import type { EditarEvento } from '../application/editarEvento';
import type { EliminarEvento } from '../application/eliminarEvento';
import type { ListarEventos } from '../application/listarEventos';
import type { ObtenerEvento } from '../application/obtenerEvento';
import {
  crearEventoSchema,
  editarEventoSchema,
  listarEventosQuerySchema,
  uuidParamSchema,
} from './schemas';

// Capa HTTP del componente Calendario (endpoints de /eventos).
// Las rutas solo "traducen" requests a llamadas de los casos de uso: validan
// el body/query con Zod en el borde (fail-fast), aplican `authenticate` y
// devuelven la respuesta en el envoltorio estándar { data }. Sin lógica de
// negocio aquí; la visibilidad de datos la decide RLS en la DB.

/** Rango máximo permitido en una consulta (90 días) para evitar escaneos masivos. */
const RANGO_MAXIMO_MS = 90 * 24 * 60 * 60 * 1000;

function getParamId(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

function parseId(raw: string | undefined): string {
  const result = uuidParamSchema.safeParse(raw);
  if (!result.success) {
    throw new BadRequestError('ID de evento inválido');
  }
  return result.data;
}

function requireAuth(req: Request): AuthRequest['auth'] {
  return (req as AuthRequest).auth;
}

export interface EventosRoutesDeps {
  jwtService: IJwtService;
  crear: CrearEvento;
  editar: EditarEvento;
  eliminar: EliminarEvento;
  listar: ListarEventos;
  obtener: ObtenerEvento;
}

export function eventosRoutes(deps: EventosRoutesDeps): Router {
  const router = Router();

  router.use(authenticate(deps.jwtService));

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const body = parseBody(crearEventoSchema, req.body);
      const result = await deps.crear.ejecutar(requireAuth(req)!, {
        titulo: body.titulo,
        descripcion: body.descripcion ?? null,
        tipo: body.tipo,
        inicioAt: body.inicio_at,
        finAt: body.fin_at ?? null,
        diaCompleto: body.dia_completo ?? false,
        recordatorioMinutos: body.recordatorio_minutos ?? null,
        decanatoIds: body.decanato_ids ?? [],
      });
      res.status(201).json({ data: result });
    }),
  );

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const query = parseBody(listarEventosQuerySchema, req.query);
      const desde = new Date(query.desde);
      const hasta = new Date(query.hasta);
      if (hasta.getTime() - desde.getTime() > RANGO_MAXIMO_MS) {
        throw new BadRequestError('El rango desde-hasta no puede superar 90 días');
      }
      const result = await deps.listar.ejecutar(requireAuth(req)!, {
        desde,
        hasta,
        limit: query.limit,
        offset: query.offset,
      });
      res.json({ data: result });
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseId(getParamId(req.params.id));
      const result = await deps.obtener.ejecutar(requireAuth(req)!, id);
      res.json({ data: result });
    }),
  );

  router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseId(getParamId(req.params.id));
      const body = parseBody(editarEventoSchema, req.body);
      const result = await deps.editar.ejecutar(requireAuth(req)!, id, {
        titulo: body.titulo,
        descripcion: body.descripcion,
        inicioAt: body.inicio_at,
        finAt: body.fin_at,
        diaCompleto: body.dia_completo,
        recordatorioMinutos: body.recordatorio_minutos,
        decanatoIds: body.decanato_ids,
      });
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
