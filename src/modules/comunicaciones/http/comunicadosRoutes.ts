import { Router, type Request } from 'express';
import { BadRequestError } from '../../../shared/errors';
import { asyncHandler, authorize, authenticate, parseBody } from '../../../shared/http/middlewares';
import type { AuthRequest } from '../../../shared/http/middlewares';
import type { IJwtService } from '../../../shared/security/jwt';
import type { CrearComunicado } from '../application/crearComunicado';
import type { EditarComunicado } from '../application/editarComunicado';
import type { ListarComunicados } from '../application/listarComunicados';
import type { ObtenerComunicado } from '../application/obtenerComunicado';
import type { SolicitarRevision } from '../application/solicitarRevision';
import type { AprobarComunicado } from '../application/aprobarComunicado';
import type { RechazarComunicado } from '../application/rechazarComunicado';
import type { PublicarComunicado } from '../application/publicarComunicado';
import type { ArchivarComunicado } from '../application/archivarComunicado';
import type { EstadisticasComunicado } from '../application/estadisticasComunicado';
import {
  aprobarComunicadoSchema,
  crearComunicadoSchema,
  editarComunicadoSchema,
  listarComunicadosQuerySchema,
  publicarComunicadoSchema,
  rechazarComunicadoSchema,
  uuidParamSchema,
} from './schemas';

export interface ComunicadosRoutesDeps {
  jwtService: IJwtService;
  crear: CrearComunicado;
  editar: EditarComunicado;
  listar: ListarComunicados;
  obtener: ObtenerComunicado;
  solicitarRevision: SolicitarRevision;
  aprobar: AprobarComunicado;
  rechazar: RechazarComunicado;
  publicar: PublicarComunicado;
  archivar: ArchivarComunicado;
  estadisticas: EstadisticasComunicado;
}

function getParamId(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

function parseId(raw: string | undefined): string {
  const result = uuidParamSchema.safeParse(raw);
  if (!result.success) {
    throw new BadRequestError('ID de comunicado inválido');
  }
  return result.data;
}

function requireAuth(req: Request): AuthRequest['auth'] {
  return (req as AuthRequest).auth;
}

export function comunicadosRoutes(deps: ComunicadosRoutesDeps): Router {
  const router = Router();

  router.use(authenticate(deps.jwtService));

  router.post(
    '/',
    authorize('COMUNICADOR'),
    asyncHandler(async (req, res) => {
      const body = parseBody(crearComunicadoSchema, req.body);
      const result = await deps.crear.ejecutar(requireAuth(req)!, {
        titulo: body.titulo,
        cuerpo: body.cuerpo,
        decanatoIds: body.decanato_ids,
        programadoPara: body.programado_para,
        expiraAt: body.expira_at,
      });
      res.status(201).json({ data: result });
    }),
  );

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const query = parseBody(listarComunicadosQuerySchema, req.query);
      const result = await deps.listar.ejecutar(requireAuth(req)!, {
        estado: query.estado,
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
    authorize('COMUNICADOR'),
    asyncHandler(async (req, res) => {
      const id = parseId(getParamId(req.params.id));
      const body = parseBody(editarComunicadoSchema, req.body);
      const result = await deps.editar.ejecutar(requireAuth(req)!, id, {
        titulo: body.titulo,
        cuerpo: body.cuerpo,
        decanatoIds: body.decanato_ids,
        programadoPara: body.programado_para,
        expiraAt: body.expira_at,
      });
      res.json({ data: result });
    }),
  );

  router.post(
    '/:id/solicitar-revision',
    authorize('COMUNICADOR'),
    asyncHandler(async (req, res) => {
      const id = parseId(getParamId(req.params.id));
      const result = await deps.solicitarRevision.ejecutar(requireAuth(req)!, id);
      res.json({ data: result });
    }),
  );

  router.post(
    '/:id/aprobar',
    authorize('ADMIN'),
    asyncHandler(async (req, res) => {
      const id = parseId(getParamId(req.params.id));
      const body = parseBody(aprobarComunicadoSchema, req.body);
      const result = await deps.aprobar.ejecutar(requireAuth(req)!, id, {
        programadoPara: body.programado_para,
        expiraAt: body.expira_at,
      });
      res.json({ data: result });
    }),
  );

  router.post(
    '/:id/rechazar',
    authorize('ADMIN'),
    asyncHandler(async (req, res) => {
      const id = parseId(getParamId(req.params.id));
      const body = parseBody(rechazarComunicadoSchema, req.body);
      const result = await deps.rechazar.ejecutar(requireAuth(req)!, id, { motivo: body.motivo });
      res.json({ data: result });
    }),
  );

  router.post(
    '/:id/publicar',
    authorize('ADMIN'),
    asyncHandler(async (req, res) => {
      const id = parseId(getParamId(req.params.id));
      const body = parseBody(publicarComunicadoSchema, req.body);
      const result = await deps.publicar.ejecutar(requireAuth(req)!, id, {
        programadoPara: body.programado_para,
        expiraAt: body.expira_at,
      });
      res.json({ data: result });
    }),
  );

  router.post(
    '/:id/archivar',
    authorize('COMUNICADOR'),
    asyncHandler(async (req, res) => {
      const id = parseId(getParamId(req.params.id));
      const result = await deps.archivar.ejecutar(requireAuth(req)!, id);
      res.json({ data: result });
    }),
  );

  router.get(
    '/:id/estadisticas',
    authorize('COMUNICADOR'),
    asyncHandler(async (req, res) => {
      const id = parseId(getParamId(req.params.id));
      const result = await deps.estadisticas.ejecutar(requireAuth(req)!, id);
      res.json({ data: result });
    }),
  );

  return router;
}
