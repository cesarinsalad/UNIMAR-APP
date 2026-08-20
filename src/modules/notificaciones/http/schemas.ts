import { z } from 'zod';
import { PLATAFORMAS } from '../domain/dispositivo';

/**
 * Esquemas Zod de los endpoints del componente Notificaciones.
 *
 * Validación en el borde (fail-fast): cualquier input inválido se rechaza
 * con 400 antes de tocar el dominio. Los nombres en snake_case reflejan la
 * convención del cliente en JSON; la capa HTTP traduce a camelCase.
 */
export const registrarDispositivoSchema = z.object({
  push_token: z.string().min(1, 'El push_token es requerido').max(500, 'Máximo 500 caracteres'),
  plataforma: z.enum(PLATAFORMAS),
});

export const listarNotificacionesQuerySchema = z.object({
  solo_no_leidas: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const uuidParamSchema = z.string().uuid('ID inválido');
