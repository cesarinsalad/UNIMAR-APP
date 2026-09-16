import type { Rol } from '@/features/identidad/types';
import type { TipoEvento } from '../types';

export interface ErroresEvento {
  titulo: string | null;
  descripcion: string | null;
  rango: string | null;
}

const SIN_ERRORES: ErroresEvento = { titulo: null, descripcion: null, rango: null };

/** Espeja crearEventoSchema del BFF (fail-fast antes del 400). */
export function validarFormularioEvento(input: {
  titulo: string;
  descripcion: string | null;
  inicio: Date;
  fin: Date | null;
}): ErroresEvento {
  const errores: ErroresEvento = { ...SIN_ERRORES };
  if (input.titulo.trim().length === 0) {
    errores.titulo = 'El título es requerido';
  } else if (input.titulo.length > 200) {
    errores.titulo = 'Máximo 200 caracteres';
  }
  if (input.descripcion !== null && input.descripcion.length > 2000) {
    errores.descripcion = 'Máximo 2000 caracteres';
  }
  if (input.fin !== null && input.fin.getTime() < input.inicio.getTime()) {
    errores.rango = 'La fecha de fin debe ser posterior al inicio';
  }
  return errores;
}

export function tieneErroresEvento(e: ErroresEvento): boolean {
  return e.titulo !== null || e.descripcion !== null || e.rango !== null;
}

/**
 * Opción A (decisión de diseño 4b): el fin SIEMPRE existe con default
 * inicio+1h; el toggle "Todo el día" lleva inicio/fin a los límites del día
 * local y oculta los pickers de hora.
 */
export function finPredeterminado(inicio: Date): Date {
  return new Date(inicio.getTime() + 60 * 60 * 1000);
}

/**
 * Aplica el toggle diaCompleto: inicio 00:00 y fin 23:59:59.999 del mismo
 * día local. Si se desactiva, devuelve el par tal cual lo que ya amaravejaba
 * el usuario (llamado solo al toggle para preservar horas elegidas).
 */
export function ajustarDiaCompleto(
  inicio: Date,
  fin: Date | null,
  activo: boolean,
): { inicio: Date; fin: Date | null } {
  if (!activo) return { inicio, fin };
  const nuevoInicio = new Date(
    inicio.getFullYear(),
    inicio.getMonth(),
    inicio.getDate(),
    0, 0, 0, 0,
  );
  const nuevoFin = new Date(
    inicio.getFullYear(),
    inicio.getMonth(),
    inicio.getDate(),
    23, 59, 59, 999,
  );
  return { inicio: nuevoInicio, fin: fin !== null ? nuevoFin : null };
}

export interface PresetRecordatorio {
  etiqueta: string;
  /** null = sin recordatorio (campo absent/null en el contrato). */
  minutos: number | null;
}

export const PRESETS_RECORDATORIO: PresetRecordatorio[] = [
  { etiqueta: 'Sin recordatorio', minutos: null },
  { etiqueta: '15 min', minutos: 15 },
  { etiqueta: '1 hora', minutos: 60 },
  { etiqueta: '1 día', minutos: 1440 },
];

/**
 * Etiqueta legible del recordatorio: reutiliza los presets conocidos y
 * genera texto para valores arbitrarios (el contrato admite cualquier
 * int ≥ 0). null = sin recordatorio (sin chip).
 */
export function etiquetaRecordatorioMinutos(minutos: number | null): string | null {
  if (minutos === null) return null;
  const preset = PRESETS_RECORDATORIO.find((p) => p.minutos === minutos);
  if (preset) return `Avisa ${preset.etiqueta.toLowerCase()} antes`;
  if (minutos < 60) return `Avisa ${minutos} min antes`;
  if (minutos % 60 === 0) {
    const horas = minutos / 60;
    return horas === 1 ? 'Avisa 1 hora antes' : `Avisa ${horas} h antes`;
  }
  return `Avisa ${(minutos / 60).toFixed(1)} h antes`;
}

/**
 * Anti-global de eventos: OFICIAL + COMUNICADOR → fijo su decanato ([]
 * prohibido). PERSONAL → no aplica (null). ADMIN → selección libre,
 * incluido [] (GLOBAL).
 */
export function audienciaParaEvento(
  rol: Rol | 'ESTUDIANTE',
  tipo: TipoEvento,
  decanato_id: number | null,
  seleccion: number[] | null,
): number[] | null {
  if (tipo === 'PERSONAL') return null;
  if (rol === 'COMUNICADOR') {
    return decanato_id !== null ? [decanato_id] : null;
  }
  return seleccion ?? [];
}
