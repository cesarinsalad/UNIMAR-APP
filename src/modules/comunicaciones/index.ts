/**
 * API pública del componente Comunicaciones.
 *
 * En el monolito modular, ningún módulo importa las internas de otro: solo lo
 * que se expone aquí es consumible desde fuera. Este componente agrupa:
 * - Comunicados (CRUD + ciclo de vida con revisión)
 * - Audiencias normalizadas (pivot `comunicado_audiencias`)
 * - Adjuntos (Supabase Storage + URLs firmadas)
 * - Lecturas (bandeja de confirmación de lectura)
 *
 * `createComunicacionesModule` compone los casos de uso y devuelve un único
 * `Router` para `/api/v1`, que a su vez monta los subrouters de comunicados
 * (`/comunicados`) y adjuntos (`/adjuntos`). Es la raíz de composición del
 * módulo (regla de dependencia de Clean Architecture).
 */
import { Router } from 'express';
import type { UnitOfWork } from '../../shared/kernel/unitOfWork';
import type { IJwtService } from '../../shared/security/jwt';
import { CrearComunicado } from './application/crearComunicado';
import { EditarComunicado } from './application/editarComunicado';
import { ListarComunicados } from './application/listarComunicados';
import { ObtenerComunicado } from './application/obtenerComunicado';
import { SolicitarRevision } from './application/solicitarRevision';
import { AprobarComunicado } from './application/aprobarComunicado';
import { RechazarComunicado } from './application/rechazarComunicado';
import { PublicarComunicado } from './application/publicarComunicado';
import { ArchivarComunicado } from './application/archivarComunicado';
import { EstadisticasComunicado } from './application/estadisticasComunicado';
import { SolicitarUrlCarga } from './application/solicitarUrlCarga';
import { RegistrarAdjunto } from './application/registrarAdjunto';
import { ListarAdjuntos } from './application/listarAdjuntos';
import { UrlDescargaAdjunto } from './application/urlDescargaAdjunto';
import { EliminarAdjunto } from './application/eliminarAdjunto';
import { PostgresComunicadoRepository } from './infrastructure/postgresComunicadoRepository';
import { PostgresAdjuntoRepository } from './infrastructure/postgresAdjuntoRepository';
import { SupabaseStorageService } from './infrastructure/supabaseStorageService';
import { comunicadosRoutes } from './http/comunicadosRoutes';
import { adjuntosRouter } from './http/adjuntosRoutes';
import { BUCKET_ADJUNTOS } from './domain/adjunto';
import type { IStorageService } from './domain/ports';

export interface ComunicacionesModuleDeps {
  uow: UnitOfWork;
  jwtService: IJwtService;
  storageService: IStorageService;
}

export interface ComunicacionesModule {
  router: Router;
}

export function createComunicacionesModule(deps: ComunicacionesModuleDeps): ComunicacionesModule {
  const comunicadoRepo = new PostgresComunicadoRepository();
  const adjuntoRepo = new PostgresAdjuntoRepository();

  const crear = new CrearComunicado(comunicadoRepo, deps.uow);
  const editar = new EditarComunicado(comunicadoRepo, deps.uow);
  const listar = new ListarComunicados(comunicadoRepo, deps.uow);
  const obtener = new ObtenerComunicado(comunicadoRepo, deps.uow);
  const solicitarRevision = new SolicitarRevision(comunicadoRepo, deps.uow);
  const aprobar = new AprobarComunicado(comunicadoRepo, deps.uow);
  const rechazar = new RechazarComunicado(comunicadoRepo, deps.uow);
  const publicar = new PublicarComunicado(comunicadoRepo, deps.uow);
  const archivar = new ArchivarComunicado(comunicadoRepo, deps.uow);
  const estadisticas = new EstadisticasComunicado(comunicadoRepo, deps.uow);

  const solicitarUrlCarga = new SolicitarUrlCarga(comunicadoRepo, deps.storageService, deps.uow);
  const registrarAdjunto = new RegistrarAdjunto(
    comunicadoRepo,
    adjuntoRepo,
    deps.storageService,
    deps.uow,
  );
  const listarAdjuntos = new ListarAdjuntos(comunicadoRepo, adjuntoRepo, deps.uow);
  const urlDescargaAdjunto = new UrlDescargaAdjunto(adjuntoRepo, deps.storageService, deps.uow);
  const eliminarAdjunto = new EliminarAdjunto(
    comunicadoRepo,
    adjuntoRepo,
    deps.storageService,
    deps.uow,
  );

  const router = Router();
  router.use(
    '/comunicados',
    comunicadosRoutes({
      jwtService: deps.jwtService,
      crear,
      editar,
      listar,
      obtener,
      solicitarRevision,
      aprobar,
      rechazar,
      publicar,
      archivar,
      estadisticas,
    }),
  );
  router.use(
    '/',
    adjuntosRouter({
      jwtService: deps.jwtService,
      solicitarUrlCarga,
      registrarAdjunto,
      listarAdjuntos,
      urlDescargaAdjunto,
      eliminarAdjunto,
    }),
  );

  return { router };
}

export { SupabaseStorageService, BUCKET_ADJUNTOS };
export type { IStorageService };
