import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { BadRequestError, ForbiddenError, UnauthorizedError } from '../errors';
import type { Claims, IJwtService } from '../security/jwt';
import { hasRole, type Role } from '../security/rbac';

export interface AuthRequest extends Request {
  auth?: Claims;
}

/** Ejecuta un handler async y reenvía errores al errorHandler central. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

/** Valida un body contra un esquema Zod y lanza 400 con la lista de issues. */
export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
      .join('; ');
    throw new BadRequestError(detail);
  }
  return result.data;
}

/** Verifica el token Bearer y adjunta los claims a req.auth. */
export function authenticate(jwtService: IJwtService) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      next(new UnauthorizedError());
      return;
    }
    try {
      (req as AuthRequest).auth = jwtService.verify(header.slice('Bearer '.length));
      next();
    } catch {
      next(new UnauthorizedError('Token inválido o expirado'));
    }
  };
}

/** RBAC: exige que el rol del token alcance el rol requerido (jerárquico). */
export function authorize(required: Role) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const auth = (req as AuthRequest).auth;
    if (!auth) {
      next(new UnauthorizedError());
      return;
    }
    if (!hasRole(auth.role, required)) {
      next(new ForbiddenError(`Se requiere rol ${required}`));
      return;
    }
    next();
  };
}

/** Middleware de error central: AppError → respuesta estructurada; resto → 500. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof UnauthorizedError || err instanceof ForbiddenError || err instanceof BadRequestError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }
  console.error('[errorHandler]', err);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' },
  });
}
