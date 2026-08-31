import { Router } from 'express';
import { apiKeyMiddleware } from '../../../shared/http/apiKeyMiddleware';
import { asyncHandler, parseBody } from '../../../shared/http/middlewares';
import type { PublicarNota } from '../application/publicarNota';
import { publicarNotaSchema } from './schemas';

// Capa HTTP del endpoint de sistema `POST /sistema/notas`.
// Protegido por API Key (no JWT) — ver `apiKeyMiddleware`.
// Su único trabajo es traducir el request al caso de uso `PublicarNota`.

export interface SistemaRoutesDeps {
  publicarNota: PublicarNota;
}

export function sistemaRoutes(deps: SistemaRoutesDeps, expectedApiKey: string): Router {
  const router = Router();
  router.use(apiKeyMiddleware(expectedApiKey));

  router.post(
    '/notas',
    asyncHandler(async (req, res) => {
      const body = parseBody(publicarNotaSchema, req.body);
      await deps.publicarNota.ejecutar({
        materiaId: body.materia_id,
        materiaNombre: body.materia_nombre,
        cedulaEstudiante: body.cedula_estudiante,
        nota: body.nota,
        periodo: body.periodo,
      });
      res.status(202).json({ data: { ok: true } });
    }),
  );

  return router;
}
