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
