/**
 * API pública del componente Notificaciones.
 *
 * En el monolito modular, ningún módulo importa las internas de otro: solo lo
 * que se expone aquí es consumible desde fuera. Este componente agrupa:
 * - Bandeja in-app (`notificaciones`) consumida por cada usuario.
 * - Registro de dispositivos (push tokens) para el fan-out de mensajes.
 *
 * `createNotificacionesModule` compone los casos de uso y devuelve un único
 * `Router` para `/api/v1`, que a su vez monta los subrouters de dispositivos
 * (`/dispositivos`) y notificaciones (`/notificaciones`). Es la raíz de
 * composición del módulo (regla de dependencia de Clean Architecture).
 *
 * En el Paso 3 — C3 este módulo se extenderá con la suscripción al EventBus
 * para los fan-outs de `COMUNICADO_PUBLICADO` y `COMUNICADO_RECHAZADO`.
 */
import { Router } from 'express';
import type { UnitOfWork } from '../../shared/kernel/unitOfWork';
import type { IJwtService } from '../../shared/security/jwt';
import { RegistrarDispositivo } from './application/registrarDispositivo';
import { ListarDispositivos } from './application/listarDispositivos';
import { EliminarDispositivo } from './application/eliminarDispositivo';
import { ListarNotificaciones } from './application/listarNotificaciones';
import { ContarNotificacionesNoLeidas } from './application/contarNotificacionesNoLeidas';
import { MarcarNotificacionLeida } from './application/marcarNotificacionLeida';
import { MarcarTodasLeidas } from './application/marcarTodasLeidas';
import { PostgresNotificacionRepository } from './infrastructure/postgresNotificacionRepository';
import { PostgresDispositivoRepository } from './infrastructure/postgresDispositivoRepository';
import { dispositivosRoutes } from './http/dispositivosRoutes';
import { notificacionesRoutes } from './http/notificacionesRoutes';

export interface NotificacionesModuleDeps {
  uow: UnitOfWork;
  jwtService: IJwtService;
}

export interface NotificacionesModule {
  router: Router;
}

export function createNotificacionesModule(
  deps: NotificacionesModuleDeps,
): NotificacionesModule {
  const notificacionRepo = new PostgresNotificacionRepository();
  const dispositivoRepo = new PostgresDispositivoRepository();

  const registrar = new RegistrarDispositivo(dispositivoRepo, deps.uow);
  const listarDispositivos = new ListarDispositivos(dispositivoRepo, deps.uow);
  const eliminarDispositivo = new EliminarDispositivo(dispositivoRepo, deps.uow);

  const listarNotificaciones = new ListarNotificaciones(notificacionRepo, deps.uow);
  const contarNoLeidas = new ContarNotificacionesNoLeidas(notificacionRepo, deps.uow);
  const marcarLeida = new MarcarNotificacionLeida(notificacionRepo, deps.uow);
  const marcarTodasLeidas = new MarcarTodasLeidas(notificacionRepo, deps.uow);

  const router = Router();
  router.use(
    '/dispositivos',
    dispositivosRoutes({
      jwtService: deps.jwtService,
      registrar,
      listar: listarDispositivos,
      eliminar: eliminarDispositivo,
    }),
  );
  router.use(
    '/notificaciones',
    notificacionesRoutes({
      jwtService: deps.jwtService,
      listar: listarNotificaciones,
      contarNoLeidas,
      marcarLeida,
      marcarTodasLeidas,
    }),
  );

  return { router };
}
