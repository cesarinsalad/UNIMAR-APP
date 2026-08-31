import { Router, type Request } from 'express';
import { asyncHandler, authenticate } from '../../../shared/http/middlewares';
import type { AuthRequest } from '../../../shared/http/middlewares';
import type { Claims, IJwtService } from '../../../shared/security/jwt';
import type { ObtenerPerfil } from '../application/obtenerPerfil';
import type { ListarMaterias } from '../application/listarMaterias';
import type { ObtenerMateriaDetalle } from '../application/obtenerMateriaDetalle';
import type { ObtenerPensum } from '../application/obtenerPensum';
import type { ObtenerHistorialMedico } from '../application/obtenerHistorialMedico';
import {
  carreraIdQuerySchema,
  listarMateriasQuerySchema,
  materiaIdParamSchema,
} from './schemas';

// Capa HTTP del componente Académico.
// Las rutas solo "traducen" requests a llamadas de los casos de uso:
// validan query/path con Zod, aplican `authenticate` y devuelven el
// envoltorio estándar { data }. Sin lógica de negocio aquí.

function requireAuth(req: Request): Claims {
  return (req as AuthRequest).auth!;
}

export interface AcademicoRoutesDeps {
  jwtService: IJwtService;
  obtenerPerfil: ObtenerPerfil;
  listarMaterias: ListarMaterias;
  obtenerMateriaDetalle: ObtenerMateriaDetalle;
  obtenerPensum: ObtenerPensum;
  obtenerHistorialMedico: ObtenerHistorialMedico;
}

export function academicoRoutes(deps: AcademicoRoutesDeps): Router {
  const router = Router();

  router.use(authenticate(deps.jwtService));

  router.get(
    '/perfil',
    asyncHandler(async (req, res) => {
      const data = await deps.obtenerPerfil.ejecutar(requireAuth(req));
      res.json({ data });
    }),
  );

  router.get(
    '/materias',
    asyncHandler(async (req, res) => {
      const query = listarMateriasQuerySchema.parse(req.query);
      const data = await deps.listarMaterias.ejecutar(requireAuth(req), { periodo: query.periodo });
      res.json({ data });
    }),
  );

  router.get(
    '/materias/:id',
    asyncHandler(async (req, res) => {
      const id = materiaIdParamSchema.parse(req.params.id);
      const data = await deps.obtenerMateriaDetalle.ejecutar(requireAuth(req), id);
      res.json({ data });
    }),
  );

  router.get(
    '/pensum',
    asyncHandler(async (req, res) => {
      const query = carreraIdQuerySchema.parse(req.query);
      const data = await deps.obtenerPensum.ejecutar(requireAuth(req), query.carrera_id);
      res.json({ data });
    }),
  );

  router.get(
    '/historial-medico',
    asyncHandler(async (req, res) => {
      const data = await deps.obtenerHistorialMedico.ejecutar(requireAuth(req));
      res.json({ data });
    }),
  );

  return router;
}
