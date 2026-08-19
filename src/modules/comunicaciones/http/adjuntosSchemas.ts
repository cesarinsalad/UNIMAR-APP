import { z } from 'zod';
import {
  MAX_TAMANO_ADJUNTO_BYTES,
  MIMES_PERMITIDOS,
} from '../domain/adjunto';

export const solicitarUrlCargaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(255, 'Máximo 255 caracteres'),
  mime_type: z.enum(MIMES_PERMITIDOS, { message: 'Tipo de archivo no permitido' }),
  tamano: z
    .number({ message: 'El tamaño debe ser un número' })
    .int('El tamaño debe ser un entero')
    .positive('El tamaño debe ser positivo')
    .max(
      MAX_TAMANO_ADJUNTO_BYTES,
      `El tamaño máximo es ${MAX_TAMANO_ADJUNTO_BYTES / (1024 * 1024)} MB`,
    ),
});

export const registrarAdjuntoSchema = z.object({
  path: z.string().min(1, 'El path es requerido'),
  nombre: z.string().min(1, 'El nombre es requerido').max(255, 'Máximo 255 caracteres'),
  mime_type: z.enum(MIMES_PERMITIDOS, { message: 'Tipo de archivo no permitido' }),
  tamano: z
    .number({ message: 'El tamaño debe ser un número' })
    .int('El tamaño debe ser un entero')
    .positive('El tamaño debe ser positivo')
    .max(
      MAX_TAMANO_ADJUNTO_BYTES,
      `El tamaño máximo es ${MAX_TAMANO_ADJUNTO_BYTES / (1024 * 1024)} MB`,
    ),
});

export const uuidParamSchema = z.string().uuid('ID inválido');
