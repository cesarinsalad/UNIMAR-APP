import type { InputComunicado } from '../api/comunicados.api';

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
