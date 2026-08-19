import { z } from 'zod';
import { ESTADOS } from '../domain/comunicado';

// Rechaza enlaces Markdown con schemes peligrosos (javascript:, data:, vbscript:).
// El cliente renderiza Markdown a componentes nativos, pero un link malicioso
// aún podría abrirse en navegador si se toca; esto previene el vector más común.
const DANGEROUS_SCHEME = /\]\(\s*(javascript|data|vbscript):/i;

export const noDangerousSchemes = (value: string) => !DANGEROUS_SCHEME.test(value);

const isoDateTime = z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
  message: 'Debe ser una fecha ISO válida',
});

export const crearComunicadoSchema = z.object({
  titulo: z.string().min(1, 'El título es requerido').max(200, 'Máximo 200 caracteres'),
  cuerpo: z
    .string()
    .min(1, 'El cuerpo es requerido')
    .max(5000, 'Máximo 5000 caracteres')
    .refine(noDangerousSchemes, 'El contenido tiene enlaces con scheme no permitido'),
  decanato_ids: z.array(z.number().int().positive()).default([]),
  programado_para: isoDateTime.optional(),
  expira_at: isoDateTime.optional(),
});

export const editarComunicadoSchema = z
  .object({
    titulo: z.string().min(1).max(200).optional(),
    cuerpo: z.string().min(1).max(5000).refine(noDangerousSchemes).optional(),
    decanato_ids: z.array(z.number().int().positive()).optional(),
    programado_para: isoDateTime.optional(),
    expira_at: isoDateTime.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Se requiere al menos un campo para editar',
  });

export const aprobarComunicadoSchema = z.object({
  programado_para: isoDateTime.optional(),
  expira_at: isoDateTime.optional(),
});

export const rechazarComunicadoSchema = z.object({
  motivo: z.string().min(1, 'El motivo es requerido').max(500, 'Máximo 500 caracteres'),
});

export const publicarComunicadoSchema = aprobarComunicadoSchema;

export const listarComunicadosQuerySchema = z.object({
  estado: z.enum(ESTADOS).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const uuidParamSchema = z.string().uuid('ID inválido');
