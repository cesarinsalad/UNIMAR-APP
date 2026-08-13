import { z } from 'zod';
import 'dotenv/config';

/**
 * Configuración del entorno, validada con Zod al arrancar.
 *
 * Fail-fast: si falta DATABASE_URL o JWT_SECRET (o un valor tiene el tipo
 * equivocado), el proceso muere con un mensaje claro en lugar de fallar
 * crípticamente a mitad de ejecución. Todo el resto del código consume `env`
 * ya tipado, sin acceder a process.env directamente.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerida'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET es requerida'),
  JWT_EXPIRES_IN: z.string().default('8h'),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('[env] Variables de entorno inválidas:', parsed.error.issues);
  process.exit(1);
}

export const env = parsed.data;
