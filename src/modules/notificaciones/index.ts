/**
 * API pública del componente Notificaciones.
 *
 * En el monolito modular, ningún módulo importa las internas de otro: solo lo
 * que se expone aquí es consumible desde fuera. Este componente agrupa:
 * - Bandeja in-app (`notificaciones`) consumida por cada usuario.
 * - Registro de dispositivos (push tokens) para el fan-out de mensajes.
 * - Suscriptores del `EventBus` que materializan los fan-outs de eventos del
 *   dominio (Paso 3 — C3: `COMUNICADO_PUBLICADO` y `COMUNICADO_RECHAZADO`).
 *
 * `createNotificacionesModule` compone casos de uso, repos y fans y devuelve
 * `{ router, fanOutPublicado, fanOutRechazado, fanOutEventoOficialCreado }`.
 * Es la raíz de composición del módulo (regla de dependencia de Clean
 * Architecture). Las suscripciones al bus se hacen en el composition root
 * del servidor, no aquí, para no acoplar el módulo a un bus concreto.
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
import { FanOutComunicadoPublicado } from './application/fanOutComunicadoPublicado';
import { FanOutComunicadoRechazado } from './application/fanOutComunicadoRechazado';
import { FanOutEventoOficialCreado } from './application/fanOutEventoOficialCreado';
import { PostgresNotificacionRepository } from './infrastructure/postgresNotificacionRepository';
import { PostgresDispositivoRepository } from './infrastructure/postgresDispositivoRepository';
import { ExpoPushService, MockPushService } from './infrastructure/pushServices';
import { dispositivosRoutes } from './http/dispositivosRoutes';
import { notificacionesRoutes } from './http/notificacionesRoutes';
import type {
  INotificacionRepository,
  IDispositivoRepository,
  IPushService,
} from './domain/ports';

export interface NotificacionesModuleDeps {
  uow: UnitOfWork;
  jwtService: IJwtService;
  pushService: IPushService;
  /**
   * Repositorios opcionales. Si no se inyectan, el módulo instancia las
   * implementaciones de Postgres por defecto. Inyectarlos desde el
   * composition root permite reutilizar la misma instancia desde otros
   * módulos (p. ej. Calendario para el job de recordatorios) sin que el
   * módulo exponga sus internos en su API pública.
   */
  notificacionRepo?: INotificacionRepository;
  dispositivoRepo?: IDispositivoRepository;
}

export interface NotificacionesModule {
  router: Router;
  fanOutPublicado: FanOutComunicadoPublicado;
  fanOutRechazado: FanOutComunicadoRechazado;
  fanOutEventoOficialCreado: FanOutEventoOficialCreado;
}

/**
 * Fábrica del proveedor de push.
 *
 * Selecciona entre `MockPushService` (default, sin red) y `ExpoPushService` a
 * partir de la flag `PUSH_PROVIDER`. Expuesto para que el composition root
 * haga el switch sin importar las clases concretas desde el resto del código.
 */
export function seleccionarPushService(provider: 'mock' | 'expo'): IPushService {
  return provider === 'expo' ? new ExpoPushService() : new MockPushService();
}

export function createNotificacionesModule(
  deps: NotificacionesModuleDeps,
): NotificacionesModule {
  const notificacionRepo = deps.notificacionRepo ?? new PostgresNotificacionRepository();
  const dispositivoRepo = deps.dispositivoRepo ?? new PostgresDispositivoRepository();

  const registrar = new RegistrarDispositivo(dispositivoRepo, deps.uow);
  const listarDispositivos = new ListarDispositivos(dispositivoRepo, deps.uow);
  const eliminarDispositivo = new EliminarDispositivo(dispositivoRepo, deps.uow);

  const listarNotificaciones = new ListarNotificaciones(notificacionRepo, deps.uow);
  const contarNoLeidas = new ContarNotificacionesNoLeidas(notificacionRepo, deps.uow);
  const marcarLeida = new MarcarNotificacionLeida(notificacionRepo, deps.uow);
  const marcarTodasLeidas = new MarcarTodasLeidas(notificacionRepo, deps.uow);

  const fanOutPublicado = new FanOutComunicadoPublicado(
    notificacionRepo,
    dispositivoRepo,
    deps.pushService,
    deps.uow,
  );
  const fanOutRechazado = new FanOutComunicadoRechazado(
    notificacionRepo,
    dispositivoRepo,
    deps.pushService,
    deps.uow,
  );
  const fanOutEventoOficialCreado = new FanOutEventoOficialCreado(
    notificacionRepo,
    dispositivoRepo,
    deps.pushService,
    deps.uow,
  );

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

  return {
    router,
    fanOutPublicado,
    fanOutRechazado,
    fanOutEventoOficialCreado,
  };
}

// Export de las implementaciones por si el composition root quiere
// instanciarlas explícitamente y compartirlas entre módulos (manteniendo
// la regla de fronteras DSBC: los internos no se importan desde otros
// módulos, solo desde el composition root).
export { PostgresNotificacionRepository, PostgresDispositivoRepository };
