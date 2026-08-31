import { z } from 'zod';

/**
 * DTOs del dominio Académico.
 *
 * Los datos académicos son propiedad de la universidad y se consumen en
 * tiempo de ejecución desde la API institucional (UNIMAR). El BFF **no los
 * persiste**: solo los transforma, valida y cachea.
 *
 * Forma del dato principal — `MateriaDTO` — modela el mismo concepto
 * ("materia del estudiante") pero con dos presentaciones distintas según
 * esté **en curso** (`es_actual=true`, vista detallada con profesor/aula/
 * cortes) o **histórica** (`es_actual=false`, vista resumida con
 * nota_final/periodo/estado). Esta unión discriminada se valida en el
 * borde con Zod usando `z.discriminatedUnion`, que escoge el schema
 * correcto a partir del discriminador y rechaza payloads mixtos.
 */

// ─── Cortes (sub-DTO) ───────────────────────────────────────────────
export const corteSchema = z.object({
  nombre: z.string().min(1),
  fecha: z.string(), // ISO 8601
  ponderacion: z.number().min(0).max(100),
  nota: z.number().min(0).max(20).nullable(),
});
export type CorteDTO = z.infer<typeof corteSchema>;

// ─── Materia: unión discriminada por `es_actual` ───────────────────
const materiaBaseShape = {
  id: z.string().min(1),
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  creditos: z.number().int().nonnegative(),
};

const materiaActualSchema = z.object({
  ...materiaBaseShape,
  es_actual: z.literal(true),
  profesor: z.string().min(1),
  aula: z.string().min(1),
  horario: z.string().min(1),
  cortes: z.array(corteSchema),
});

const materiaHistoricaSchema = z.object({
  ...materiaBaseShape,
  es_actual: z.literal(false),
  periodo: z.string().min(1),
  nota_final: z.number().min(0).max(20).nullable(),
  estado: z.enum(['APROBADA', 'REPROBADA', 'RETIRADA']),
});

export const materiaSchema = z.discriminatedUnion('es_actual', [
  materiaActualSchema,
  materiaHistoricaSchema,
]);
export type MateriaDTO = z.infer<typeof materiaSchema>;
export type MateriaActualDTO = z.infer<typeof materiaActualSchema>;
export type MateriaHistoricaDTO = z.infer<typeof materiaHistoricaSchema>;

// ─── Perfil académico ───────────────────────────────────────────────
export const perfilAcademicoSchema = z.object({
  cedula: z.string().min(1),
  nombre: z.string().min(1),
  carrera: z.string().min(1),
  semestre: z.number().int().positive(),
  promedio: z.number().min(0).max(20).nullable(),
  estatus: z.enum(['ACTIVO', 'INACTIVO', 'GRADUADO', 'EGRESADO']),
});
export type PerfilAcademico = z.infer<typeof perfilAcademicoSchema>;

// ─── Pénsum ─────────────────────────────────────────────────────────
export const pensumMateriaSchema = z.object({
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  creditos: z.number().int().nonnegative(),
  semestreSugerido: z.number().int().positive(),
  prerequisitos: z.array(z.string()),
});
export const pensumSchema = z.object({
  carrera: z.string().min(1),
  materias: z.array(pensumMateriaSchema),
});
export type PensumDTO = z.infer<typeof pensumSchema>;

// ─── Historial médico ──────────────────────────────────────────────
export const historialMedicoSchema = z.object({
  cedula: z.string().min(1),
  tipoSangre: z.string().min(1),
  alergias: z.array(z.string()),
  vacunas: z.array(
    z.object({
      nombre: z.string().min(1),
      fecha: z.string(),
    }),
  ),
});
export type HistorialMedicoDTO = z.infer<typeof historialMedicoSchema>;
