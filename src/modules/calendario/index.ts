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
 */
import { Router } from 'express';
import type { UnitOfWork } from '../../shared/kernel/unitOfWork';
import type { IJwtService } from '../../shared/security/jwt';
import type { EventBus } from '../../shared/kernel/eventos';
import { CrearEvento } from './application/crearEvento';
import { EditarEvento } from './application/editarEvento';
import { EliminarEvento } from './application/eliminarEvento';
import { ListarEventos } from './application/listarEventos';
import { ObtenerEvento } from './application/obtenerEvento';
import { PostgresEventoRepository } from './infrastructure/postgresEventoRepository';
import { eventosRoutes } from './http/eventosRoutes';
import type {
  INotificacionRepository,
  IDispositivoRepository,
  IPushService,
} from '../notificaciones/domain/ports';
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
  /** Dependencias del job de recordatorios (opcional). */
  notifRepo?: INotificacionRepository;
  dispositivoRepo?: IDispositivoRepository;
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

function createNoopNotifRepo(): INotificacionRepository {
  return {
    listar: async () => [],
    contarNoLeidas: async () => 0,
    marcarLeida: async () => null,
    marcarTodasLeidas: async () => 0,
    crearMasivo: async () => undefined,
  };
}

function createNoopDispositivoRepo(): IDispositivoRepository {
  return {
    upsert: async () => null,
    listarPorUsuario: async () => [],
    eliminar: async () => false,
    tokensDeUsuarios: async () => [],
  };
}

function createNoopPushService(): IPushService {
  return { enviar: async () => undefined };
}
