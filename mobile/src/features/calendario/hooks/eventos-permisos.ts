import type { Rol } from '@/features/identidad/types';
import type { TipoEvento } from '../types';

export interface AccionesEvento {
  puedeEditar: boolean;
  puedeEliminar: boolean;
}

const NADA: AccionesEvento = { puedeEditar: false, puedeEliminar: false };

/**
 * RBAC UI de eventos — espejo de las políticas RLS del calendario:
 *  - PERSONAL: solo el dueño edita/elimina (cualquier rol que sea dueño).
 *  - OFICIAL: ADMIN siempre; COMUNICADOR solo lo que él creó.
 * Ocultar aquí es UX — el servidor tiene la última palabra (403).
 * El tipo en edición no se expone ni se pregunta (contrato lo prohíbe).
 *
 * Consumidor: la CONSOLA de gestión (filtro de gestionables). La hoja de
 * detalle usa la regla aparte `accionesEnHoja` — su política de ficha es
 * más estricta y no depende del rol.
 */
export function accionesPermitidasEvento(input: {
  rol: Rol | null;
  esDueno: boolean;
  tipo: TipoEvento;
}): AccionesEvento {
  const { rol, esDueno, tipo } = input;
  if (!rol) return NADA;

  if (tipo === 'PERSONAL') {
    return esDueno ? { puedeEditar: true, puedeEliminar: true } : NADA;
  }

  const esAdmin = rol === 'ADMIN';
  if (esAdmin || (rol === 'COMUNICADOR' && esDueno)) {
    return { puedeEditar: true, puedeEliminar: true };
  }
  return NADA;
}

/**
 * Regla de FICHA (hoja de detalle del evento): los círculos de editar/
 * eliminar solo aparecen para eventos PERSONAL del dueño — cualquier rol
 * (un ESTUDIANTE dueño los tiene; el ADMIN no los recibe para los de
 * staff). Los tipos de staff (OFICIAL/INSTITUCIONAL/FERIADO) se editan/
 * eliminan EXCLUSIVAMENTE desde la consola de gestión: en la hoja abren
 * solo para VER. Política UI más estricta que el RBAC de escritura — el
 * servidor no cambia (RLS/use cases siguen siendo la última palabra).
 */
export function accionesEnHoja(input: {
  esDueno: boolean;
  tipo: TipoEvento;
}): AccionesEvento {
  if (input.tipo !== 'PERSONAL') return NADA;
  return input.esDueno ? { puedeEditar: true, puedeEliminar: true } : NADA;
}
