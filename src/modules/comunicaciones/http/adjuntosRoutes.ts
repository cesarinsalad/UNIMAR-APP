import { Router, type Request } from 'express';
import { BadRequestError } from '../../../shared/errors';
import { asyncHandler, authorize, authenticate, parseBody } from '../../../shared/http/middlewares';
import type { AuthRequest } from '../../../shared/http/middlewares';
import type { IJwtService } from '../../../shared/security/jwt';
import type { SolicitarUrlCarga } from '../application/solicitarUrlCarga';
import type { RegistrarAdjunto } from '../application/registrarAdjunto';
import type { ListarAdjuntos } from '../application/listarAdjuntos';
import type { UrlDescargaAdjunto } from '../application/urlDescargaAdjunto';
import type { EliminarAdjunto } from '../application/eliminarAdjunto';
import { registrarAdjuntoSchema, solicitarUrlCargaSchema, uuidParamSchema } from './adjuntosSchemas';

// Capa HTTP del componente Comunicaciones (endpoints de adjuntos).
// Implementa el flujo de subida en DOS FASES:
//  1) POST /comunicados/:id/adjuntos/url-carga  → devuelve una URL firmada
//  2) POST /comunicados/:id/adjuntos            → registra metadatos tras subir
// La lectura/descarga y el borrado se exponen bajo /adjuntos. Validación con
// Zod en el borde (fail-fast) y sin lógica de negocio aquí.


export interface AdjuntosRoutesDeps {
  jwtService: IJwtService;
  solicitarUrlCarga: SolicitarUrlCarga;
  registrarAdjunto: RegistrarAdjunto;
  listarAdjuntos: ListarAdjuntos;
  urlDescargaAdjunto: UrlDescargaAdjunto;
  eliminarAdjunto: EliminarAdjunto;
}

function getParamId(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

function parseId(raw: string | undefined): string {
  const result = uuidParamSchema.safeParse(raw);
  if (!result.success) {
    throw new BadRequestError('ID inválido');
  }
  return result.data;
}

function requireAuth(req: Request): AuthRequest['auth'] {
  return (req as AuthRequest).auth;
}

export function adjuntosRouter(deps: AdjuntosRoutesDeps): Router {
  const router = Router({ mergeParams: true });

  router.use(authenticate(deps.jwtService));

  router.post(
    '/comunicados/:id/adjuntos/url-carga',
    authorize('COMUNICADOR'),
    asyncHandler(async (req, res) => {
      const comunicadoId = parseId(getParamId(req.params.id));
      const body = parseBody(solicitarUrlCargaSchema, req.body);
      const result = await deps.solicitarUrlCarga.ejecutar(requireAuth(req)!, {
        comunicadoId,
        nombre: body.nombre,
        mimeType: body.mime_type,
        tamano: body.tamano,
      });
      res.json({ data: result });
    }),
  );

  router.post(
    '/comunicados/:id/adjuntos',
    authorize('COMUNICADOR'),
    asyncHandler(async (req, res) => {
      const comunicadoId = parseId(getParamId(req.params.id));
      const body = parseBody(registrarAdjuntoSchema, req.body);
      const result = await deps.registrarAdjunto.ejecutar(requireAuth(req)!, {
        comunicadoId,
        path: body.path,
        nombre: body.nombre,
        mimeType: body.mime_type,
        tamano: body.tamano,
      });
      res.status(201).json({ data: result });
    }),
  );

  router.get(
    '/comunicados/:id/adjuntos',
    asyncHandler(async (req, res) => {
      const comunicadoId = parseId(getParamId(req.params.id));
      const result = await deps.listarAdjuntos.ejecutar(requireAuth(req)!, comunicadoId);
      res.json({ data: result });
    }),
  );

  router.get(
    '/adjuntos/:id/url-descarga',
    asyncHandler(async (req, res) => {
      const adjuntoId = parseId(getParamId(req.params.id));
      const result = await deps.urlDescargaAdjunto.ejecutar(requireAuth(req)!, adjuntoId);
      res.json({ data: result });
    }),
  );

  router.delete(
    '/adjuntos/:id',
    authorize('COMUNICADOR'),
    asyncHandler(async (req, res) => {
      const adjuntoId = parseId(getParamId(req.params.id));
      await deps.eliminarAdjunto.ejecutar(requireAuth(req)!, adjuntoId);
      res.status(204).send();
    }),
  );

  return router;
}
