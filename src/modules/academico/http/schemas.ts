import { z } from 'zod';

/**
 * Esquemas Zod de los endpoints del componente Académico.
 *
 * Validación en el borde (fail-fast): cualquier input inválido se rechaza
 * con 400 antes de tocar el dominio.
 */
export const listarMateriasQuerySchema = z.object({
  periodo: z.string().min(1).max(20).optional(),
});

export const carreraIdQuerySchema = z.object({
  carrera_id: z.string().min(1).max(50),
});

export const materiaIdParamSchema = z.string().min(1).max(50);

export const publicarNotaSchema = z.object({
  materia_id: z.string().min(1).max(50),
  materia_nombre: z.string().min(1).max(200),
  cedula_estudiante: z.string().min(1).max(20),
  nota: z.number().min(0).max(20),
  periodo: z.string().min(1).max(20),
});
