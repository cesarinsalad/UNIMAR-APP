import { Pool } from 'pg';
import { env } from './config/env';
import { createApp } from './app';
import { UnitOfWork } from './shared/kernel/unitOfWork';
import { EventBus } from './shared/kernel/eventos';
import { JwtService } from './shared/security/jwt';
import {
  AuthService,
  MockUniversityAuthService,
  PostgresUsuarioRepository,
} from './modules/identidad';
import {
  BUCKET_ADJUNTOS,
  createComunicacionesModule,
  SupabaseStorageService,
} from './modules/comunicaciones';
import {
  createNotificacionesModule,
  seleccionarPushService,
} from './modules/notificaciones';

// ─── Composition root (único lugar con new de implementaciones concretas) ───
const pool = new Pool({ connectionString: env.DATABASE_URL });
const uow = new UnitOfWork(pool);
const jwtService = new JwtService(env.JWT_SECRET, env.JWT_EXPIRES_IN);
const authService = new AuthService(
  new MockUniversityAuthService(),
  new PostgresUsuarioRepository(),
  jwtService,
  uow,
);
const storageService = new SupabaseStorageService({
  url: env.SUPABASE_URL,
  serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  bucket: BUCKET_ADJUNTOS,
});

// Push provider: seleccionar según env (Paso 3 — C3).
const pushService = seleccionarPushService(env.PUSH_PROVIDER);

// Bus de eventos + módulo de notificaciones + suscripciones del fan-out.
const bus = new EventBus();
const notificacionesModule = createNotificacionesModule({ uow, jwtService, pushService });
// Las suscripciones se hacen aquí, en el composition root, para evitar
// acoplar el módulo de Notificaciones a una instancia concreta de bus.
// El bus publica los argumentos con el tipo unión `Evento`, así que los
// handlers reciben exactamente la variante correspondiente vía la estrecha
// utilidad `manejar` que ambos exponen.
bus.suscribir('COMUNICADO_PUBLICADO', (e) =>
  notificacionesModule.fanOutPublicado.manejar(e),
);
bus.suscribir('COMUNICADO_RECHAZADO', (e) =>
  notificacionesModule.fanOutRechazado.manejar(e),
);

const comunicacionesModule = createComunicacionesModule({
  uow,
  jwtService,
  storageService,
  eventos: bus,
});

const app = createApp({
  authService,
  jwtService,
  uow,
  comunicacionesRouter: comunicacionesModule.router,
  notificacionesRouter: notificacionesModule.router,
});

const server = app.listen(env.PORT, () => {
  console.log(`[server] UNIMARapp BFF corriendo en http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

// ─── Shutdown gracioso ───
const shutdown = async (signal: string) => {
  console.log(`[server] ${signal} recibido. Cerrando conexiones...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
