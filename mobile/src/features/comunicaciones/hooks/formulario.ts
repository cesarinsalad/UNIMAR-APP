import {
  MAX_TAMANO_ADJUNTO_BYTES,
  MIMES_PERMITIDOS,
  TAMANO_MAX_MB,
} from '../types';
import type { InputComunicado } from '../api/comunicados.api';
import type { MimePermitido } from '../types';

/** Alias local para no repetir el largo en cada check. */
const MIMES: readonly MimePermitido[] = MIMES_PERMITIDOS;

export interface ErroresAdjunto {
  nombre: string | null;
  mimeType: string | null;
  tamano: string | null;
}

export interface ErroresFormulario {
  titulo: string | null;
  cuerpo: string | null;
  audiencia: string | null;
}

const SIN_ERRORES: ErroresFormulario = {
  titulo: null,
  cuerpo: null,
  audiencia: null,
};

/** Espeja crearComunicadoSchema del BFF: validación 400 evitable antes de enviar. */
export function validarFormularioComunicado(input: Partial<InputComunicado>): ErroresFormulario {
  const errores: ErroresFormulario = { ...SIN_ERRORES };
  if (input.titulo !== undefined) {
    if (input.titulo.trim().length === 0) {
      errores.titulo = 'El título es requerido';
    } else if (input.titulo.length > 200) {
      errores.titulo = 'Máximo 200 caracteres';
    }
  }
  if (input.cuerpo !== undefined) {
    if (input.cuerpo.trim().length === 0) {
      errores.cuerpo = 'El cuerpo es requerido';
    } else if (input.cuerpo.length > 5000) {
      errores.cuerpo = 'Máximo 5000 caracteres';
    }
  }
  if (Array.isArray(input.decanatoIds)) {
    if (input.decanatoIds.some((d) => !Number.isInteger(d) || d <= 0)) {
      errores.audiencia = 'Audiencia inválida';
    }
  }
  return errores;
}

/** true si al menos un error no nulo. */
export function tieneErrores(e: ErroresFormulario): boolean {
  return e.titulo !== null || e.cuerpo !== null || e.audiencia !== null;
}

/**
 * Anti-global (contrato crearComunicado): un COMUNICADOR solo puede
 * dirigirse a su propio decanato y nunca sin audiencia ([] = GLOBAL). El
 * ADMIN no tiene esta restricción.
 */
export function clampAudiencia(
  rol: 'ESTUDIANTE' | 'COMUNICADOR' | 'ADMIN',
  decanato_id: number | null,
  seleccion: number[],
): number[] {
  if (rol === 'COMUNICADOR') {
    return decanato_id !== null ? [decanato_id] : [];
  }
  return seleccion;
}

// ─── Adjuntos (espejo de adjuntosSchemas del BFF) ──────────────────────────

export interface ErroresAdjunto {
  nombre: string | null;
  mimeType: string | null;
  tamano: string | null;
}

/**
 * Validación de un archivo antes de pedir URL firmada (evita el 400).
 * Espeja `solicitarUrlCargaSchema`: nombre 1..255, mimes de la lista
 * permitida, tamaño positivo y ≤ 5 MB.
 */
export function validarAdjunto(input: {
  nombre: string;
  mimeType: string;
  tamano: number;
}): ErroresAdjunto {
  const errores: ErroresAdjunto = { nombre: null, mimeType: null, tamano: null };
  if (input.nombre.trim().length === 0) {
    errores.nombre = 'El nombre es requerido';
  } else if (input.nombre.length > 255) {
    errores.nombre = 'Máximo 255 caracteres';
  }
  if (!(MIMES as readonly string[]).includes(input.mimeType)) {
    errores.mimeType = 'Tipo de archivo no permitido (solo PDF, PNG o JPEG)';
  }
  if (!Number.isInteger(input.tamano) || input.tamano <= 0) {
    errores.tamano = 'Tamaño inválido';
  } else if (input.tamano > MAX_TAMANO_ADJUNTO_BYTES) {
    errores.tamano = `El tamaño máximo es ${TAMANO_MAX_MB} MB`;
  }
  return errores;
}

/** true si al menos un error del adjunto no es nulo. */
export function tieneErroresAdjunto(e: ErroresAdjunto): boolean {
  return e.nombre !== null || e.mimeType !== null || e.tamano !== null;
}

/** Tamaño legible: B / KB / MB con un decimal desde KB. */
export function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
