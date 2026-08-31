import type { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../errors';

/**
 * Middleware de autenticación por API Key (sistema a sistema).
 *
 * Compara el header `X-API-Key` contra el valor configurado en
 * `SISTEMA_API_KEY` (variable de entorno). Sin JWT; pensado para canales
 * dedicados (cron jobs, webhooks internos) donde el cliente no es un
 * usuario humano del BFF.
 *
 * Decisión de seguridad (Paso 5): los endpoints de sistema (ej.
 * `POST /sistema/notas`) NO usan el JWT del ADMIN, sino una API Key
 * dedicada para evitar que un administrador del sistema con sesión
 * activa pueda simular la publicación de notas.
 */
export function apiKeyMiddleware(expectedKey: string) {
  if (!expectedKey) {
    throw new Error('apiKeyMiddleware requiere SISTEMA_API_KEY configurada');
  }
  return (req: Request, _res: Response, next: NextFunction) => {
    const provided = req.header('X-API-Key');
    if (!provided || provided !== expectedKey) {
      next(new UnauthorizedError('API Key inválida o ausente'));
      return;
    }
    next();
  };
}
