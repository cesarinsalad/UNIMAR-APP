import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, parseBody } from '../../../shared/http/middlewares';
import type { AuthService } from '../application/authService';

const loginSchema = z.object({
  email: z.email('Correo institucional inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export function authRouter(authService: AuthService): Router {
  const router = Router();

  router.post(
    '/login',
    asyncHandler(async (req, res) => {
      const body = parseBody(loginSchema, req.body);
      const result = await authService.login(body);
      res.json({ data: result });
    }),
  );

  return router;
}
