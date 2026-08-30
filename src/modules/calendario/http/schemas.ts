import { z } from 'zod';
import { TIPOS_EVENTO } from '../domain/evento';

/**
 * Esquemas Zod de los endpoints del componente Calendario.
 *
 * Validación en el borde (fail-fast): cualquier input inválido se rechaza
 * con 400 antes de tocar el dominio. Los nombres en snake_case reflejan la
 * convención del cliente en JSON; la capa HTTP traduce a camelCase.
 */
const isoDateTime = z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
  message: 'Debe ser una fecha ISO válida',
});

export const crearEventoSchema = z
  .object({
    titulo: z.string().min(1, 'El título es requerido').max(200, 'Máximo 200 caracteres'),
    descripcion: z.string().max(2000, 'Máximo 2000 caracteres').optional(),
    tipo: z.enum(TIPOS_EVENTO),
    inicio_at: isoDateTime,
    fin_at: isoDateTime.optional(),
    dia_completo: z.boolean().optional(),
    recordatorio_minutos: z.number().int().nonnegative().optional(),
    decanato_ids: z.array(z.number().int().positive()).optional(),
  })
  .refine(
    (data) =>
      !data.fin_at || new Date(data.fin_at) >= new Date(data.inicio_at),
    { message: 'fin_at debe ser mayor o igual a inicio_at', path: ['fin_at'] },
  );

export const editarEventoSchema = z
  .object({
    titulo: z.string().min(1).max(200).optional(),
    descripcion: z.string().max(2000).nullable().optional(),
    inicio_at: isoDateTime.optional(),
    fin_at: isoDateTime.nullable().optional(),
    dia_completo: z.boolean().optional(),
    recordatorio_minutos: z.number().int().nonnegative().nullable().optional(),
    decanato_ids: z.array(z.number().int().positive()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Se requiere al menos un campo para editar',
  });

export const listarEventosQuerySchema = z.object({
  desde: isoDateTime,
  hasta: isoDateTime,
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const uuidParamSchema = z.string().uuid('ID inválido');
