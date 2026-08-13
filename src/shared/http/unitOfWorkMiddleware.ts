import type { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../errors';
import type { DbTx } from '../kernel/db';
import type { UnitOfWork } from '../kernel/unitOfWork';
import type { AuthRequest } from './middlewares';

export interface DbAwareRequest extends AuthRequest {
  db: {
    /** Transacción sin claims: operaciones del sistema (login, jobs). */
    run: <T>(fn: (tx: DbTx) => Promise<T>) => Promise<T>;
    /** Transacción con los claims del token: las políticas RLS evalúan al usuario real. */
    runAsUser: <T>(fn: (tx: DbTx) => Promise<T>) => Promise<T>;
  };
}

export function unitOfWorkMiddleware(uow: UnitOfWork) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    (req as DbAwareRequest).db = {
      run: (fn) => uow.run(fn),
      runAsUser: (fn) => {
        if (!authReq.auth) throw new UnauthorizedError();
        return uow.runAs(
          {
            sub: authReq.auth.sub,
            role: authReq.auth.role,
            decanato_id: authReq.auth.decanato_id,
            nombre: authReq.auth.nombre,
          },
          fn,
        );
      },
    };
    next();
  };
}
