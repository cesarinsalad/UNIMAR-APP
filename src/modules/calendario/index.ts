/**
 * API pública del componente Calendario.
 *
 * En el monolito modular, ningún módulo importa las internas de otro: solo lo
 * que se expone aquí es consumible desde fuera. Este componente agrupa:
 *  - Eventos (oficiales y personales) con CRUD + ciclo de vida simple.
 *  - Audiencias normalizadas (pivot `evento_audiencias`).
 *  - Job de recordatorios que notifica a los destinatarios minutos antes
 *    del inicio del evento.
 *
 * `createCalendarioModule` compone los casos de uso y devuelve `{ router,
 * recordatoriosJob }`. El job se inicia en el composition root del servidor
 * (no aquí) para no acoplar el módulo al ciclo de vida de Express.
 *
 * Las dependencias del job de recordatorios (`notifRepo`, `dispositivoRepo`,
 * `pushService`) se tipifican con puertos del **shared kernel**, no del
 * módulo de Notificaciones. Esto preserva la regla DSBC: ningún módulo
 * importa las interfaces de otro módulo. En el composition root se
 * inyectan los repos de Notificaciones (que extienden los puertos del
 * shared kernel) directamente desde `server.ts`.
 */
import { Router } from 'express';
import type { UnitOfWork } from '../../shared/kernel/unitOfWork';
import type { IJwtService } from '../../shared/security/jwt';
import type { EventBus } from '../../shared/kernel/eventos';
import type {
  INotificadorInApp,
  IProveedorTokens,
  IPushService,
} from '../../shared/kernel/notificacion';
import { CrearEvento } from './application/crearEvento';
import { EditarEvento } from './application/editarEvento';
import { EliminarEvento } from './application/eliminarEvento';
import { ListarEventos } from './application/listarEventos';
import { ObtenerEvento } from './application/obtenerEvento';
import { PostgresEventoRepository } from './infrastructure/postgresEventoRepository';
import { eventosRoutes } from './http/eventosRoutes';
import { RecordatoriosJob } from './application/recordatoriosJob';

export interface CalendarioModuleDeps {
  uow: UnitOfWork;
  jwtService: IJwtService;
  /**
   * Bus opcional. Si se inyecta, `CrearEvento` emite
   * `EVENTO_OFICIAL_CREADO` durante el tx para los oficiales y se ejecutan
   * los jobs de fan-out post-COMMIT. Sin bus: comportamiento idéntico.
   */
  eventos?: EventBus;
  /** Dependencias del job de recordatorios (puertos del shared kernel). */
  notifRepo?: INotificadorInApp;
  dispositivoRepo?: IProveedorTokens;
  pushService?: IPushService;
}

export interface CalendarioModule {
  router: Router;
  recordatoriosJob: RecordatoriosJob;
}

export function createCalendarioModule(deps: CalendarioModuleDeps): CalendarioModule {
  const eventoRepo = new PostgresEventoRepository();

  const crear = new CrearEvento(eventoRepo, deps.uow, deps.eventos);
  const editar = new EditarEvento(eventoRepo, deps.uow);
  const eliminar = new EliminarEvento(eventoRepo, deps.uow);
  const listar = new ListarEventos(eventoRepo, deps.uow);
  const obtener = new ObtenerEvento(eventoRepo, deps.uow);

  const router = Router();
  router.use(
    '/eventos',
    eventosRoutes({
      jwtService: deps.jwtService,
      crear,
      editar,
      eliminar,
      listar,
      obtener,
    }),
  );

  // El job solo se instancia si se inyectaron las dependencias de notificación;
  // si no, devuelve un objeto inerte que no hace nada al iniciar.
  const recordatoriosJob = new RecordatoriosJob(
    eventoRepo,
    deps.notifRepo ?? createNoopNotifRepo(),
    deps.dispositivoRepo ?? createNoopDispositivoRepo(),
    deps.pushService ?? createNoopPushService(),
    deps.uow,
  );

  return { router, recordatoriosJob };
}

function createNoopNotifRepo(): INotificadorInApp {
  return {
    crearMasivo: async () => undefined,
  };
}

function createNoopDispositivoRepo(): IProveedorTokens {
  return {
    tokensDeUsuarios: async () => [],
  };
}

function createNoopPushService(): IPushService {
  return { enviar: async () => undefined };
}
