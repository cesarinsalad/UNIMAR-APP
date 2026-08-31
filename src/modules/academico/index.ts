/**
 * API pública del componente Académico (frontera DSBC, Paso 5).
 *
 * Este módulo es un **proxy puro** contra la API de UNIMAR: no escribe en
 * la base de datos y no emite eventos por sí solo (salvo el caso de uso
 * de sistema `PublicarNota`, que se cablea en Commit 3 vía EventBus).
 *
 * `createAcademicoModule` compone los casos de uso y devuelve:
 *  - `router`: rutas GET bajo `/api/v1/academico/*` (JWT, datos del estudiante).
 *  - `sistemaRouter`: rutas POST bajo `/api/v1/sistema/*` (API Key).
 */
import { Router } from 'express';
import type { IJwtService } from '../../shared/security/jwt';
import type { ICedulaResolver, IUsuarioIdResolver } from '../../shared/kernel/cedulaResolver';
import type { UnitOfWork } from '../../shared/kernel/unitOfWork';
import type { EventBus } from '../../shared/kernel/eventos';
import type { IUniversityAcademicService } from './domain/ports';
import { ObtenerPerfil } from './application/obtenerPerfil';
import { ListarMaterias } from './application/listarMaterias';
import { ObtenerMateriaDetalle } from './application/obtenerMateriaDetalle';
import { ObtenerPensum } from './application/obtenerPensum';
import { ObtenerHistorialMedico } from './application/obtenerHistorialMedico';
import { PublicarNota } from './application/publicarNota';
import { academicoRoutes } from './http/academicoRoutes';
import { sistemaRoutes } from './http/sistemaRoutes';

export interface AcademicoModuleDeps {
  uow: UnitOfWork;
  jwtService: IJwtService;
  /** Servicio académico (típicamente ya envuelto en caché). */
  academicService: IUniversityAcademicService;
  /** Resolutor UUID→cédula (compartido por composition root con Identidad). */
  cedulaResolver: ICedulaResolver;
  /** Resolutor cédula→UUID (compartido por composition root con Identidad). */
  usuarioIdResolver: IUsuarioIdResolver;
  /** Bus opcional. Si se inyecta, `PublicarNota` emite `NOTA_PUBLICADA`. */
  eventos?: EventBus;
  /** API Key para los endpoints de sistema (vía env SISTEMA_API_KEY). */
  sistemaApiKey: string;
}

export interface AcademicoModule {
  router: Router;
  sistemaRouter: Router;
}

export function createAcademicoModule(deps: AcademicoModuleDeps): AcademicoModule {
  const obtenerPerfil = new ObtenerPerfil(deps.academicService, deps.cedulaResolver, deps.uow);
  const listarMaterias = new ListarMaterias(deps.academicService, deps.cedulaResolver, deps.uow);
  const obtenerMateriaDetalle = new ObtenerMateriaDetalle(
    deps.academicService,
    deps.cedulaResolver,
    deps.uow,
  );
  const obtenerPensum = new ObtenerPensum(deps.academicService, deps.cedulaResolver, deps.uow);
  const obtenerHistorialMedico = new ObtenerHistorialMedico(
    deps.academicService,
    deps.cedulaResolver,
    deps.uow,
  );
  const publicarNota = new PublicarNota(
    deps.usuarioIdResolver,
    deps.uow,
    deps.eventos,
  );

  const router = Router();
  router.use(
    academicoRoutes({
      jwtService: deps.jwtService,
      obtenerPerfil,
      listarMaterias,
      obtenerMateriaDetalle,
      obtenerPensum,
      obtenerHistorialMedico,
    }),
  );

  const sistemaRouter = Router();
  sistemaRouter.use(sistemaRoutes({ publicarNota }, deps.sistemaApiKey));

  return { router, sistemaRouter };
}

// Re-exports útiles para que el composition root pueda usar el wrapper de
// caché sin importar la implementación directamente.
export { CachedUniversityAcademicService } from './infrastructure/cachedUniversityAcademicService';
export { MockUniversityAcademicService } from './infrastructure/mockUniversityAcademicService';
export { ApiUniversityAcademicService } from './infrastructure/apiUniversityAcademicService';
