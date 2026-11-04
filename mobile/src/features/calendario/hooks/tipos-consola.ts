import type { TipoEvento } from '@/features/calendario/types';
import type { Rol } from '@/features/identidad/types';

/**
 * Tipos que la consola de gestión ofrece al crear un evento. Los PERSONALES
 * NO se gestionan aquí (viven en el tab calendario de la app, creación y
 * edición del dueño): ADMIN crea oficiales, institucionales y feriados;
 * COMUNICADOR solo oficiales. El primero de la lista es el default del
 * formulario (OFICIAL).
 */
export function tiposConsola(rol: Rol | null | undefined): TipoEvento[] {
  if (rol === 'ADMIN') return ['OFICIAL', 'INSTITUCIONAL', 'FERIADO'];
  if (rol === 'COMUNICADOR') return ['OFICIAL'];
  return [];
}
