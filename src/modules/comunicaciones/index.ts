import type { Router } from 'express';
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
import { PostgresComunicadoRepository } from './infrastructure/postgresComunicadoRepository';
import { comunicadosRoutes } from './http/comunicadosRoutes';

export interface ComunicacionesModuleDeps {
  uow: UnitOfWork;
  jwtService: IJwtService;
}

export interface ComunicacionesModule {
  router: Router;
}

export function createComunicacionesModule(deps: ComunicacionesModuleDeps): ComunicacionesModule {
  const repo = new PostgresComunicadoRepository();

  const crear = new CrearComunicado(repo, deps.uow);
  const editar = new EditarComunicado(repo, deps.uow);
  const listar = new ListarComunicados(repo, deps.uow);
  const obtener = new ObtenerComunicado(repo, deps.uow);
  const solicitarRevision = new SolicitarRevision(repo, deps.uow);
  const aprobar = new AprobarComunicado(repo, deps.uow);
  const rechazar = new RechazarComunicado(repo, deps.uow);
  const publicar = new PublicarComunicado(repo, deps.uow);
  const archivar = new ArchivarComunicado(repo, deps.uow);
  const estadisticas = new EstadisticasComunicado(repo, deps.uow);

  return {
    router: comunicadosRoutes({
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
  };
}
