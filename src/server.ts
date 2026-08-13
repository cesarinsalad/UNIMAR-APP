import { Pool } from 'pg';
import { env } from './config/env';
import { createApp } from './app';
import { UnitOfWork } from './shared/kernel/unitOfWork';
import { JwtService } from './shared/security/jwt';
import {
  AuthService,
  MockUniversityAuthService,
  PostgresUsuarioRepository,
} from './modules/identidad';

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

const app = createApp({ authService, jwtService, uow });

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
