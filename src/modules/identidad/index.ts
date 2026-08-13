/**
 * API pública del componente Identidad (frontera DSBC).
 *
 * En el monolito modular, ningún módulo importa las internas de otro: solo lo
 * que se re-exporta aquí es consumible desde fuera. Esto mantiene las
 * dependencias acíclicas y hace que el componente sea intercambiable
 * (regla de dependencia de Clean Architecture).
 */
export { AuthService } from './application/authService';
export type { LoginResult } from './application/authService';
export { MockUniversityAuthService } from './infrastructure/mockUniversityAuthService';
export { PostgresUsuarioRepository } from './infrastructure/postgresUsuarioRepository';
export { authRouter } from './http/authRoutes';
