import type { Rol } from '@/features/identidad/types';
import type { EstadoComunicado } from '../types';

export interface AccionesComunicado {
  puedeEditar: boolean;
  puedeSolicitarRevision: boolean;
  puedeAprobar: boolean;
  puedeRechazar: boolean;
  puedePublicar: boolean;
  puedeArchivar: boolean;
}

const NADA: AccionesComunicado = {
  puedeEditar: false,
  puedeSolicitarRevision: false,
  puedeAprobar: false,
  puedeRechazar: false,
  puedePublicar: false,
  puedeArchivar: false,
};

/**
 * RBAC UI de comunicados — espejo de las reglas del BFF (comunicadosRoutes +
 * casos de uso + RLS). OCULTAR aquí es UX: la seguridad real se aplica en el
 * servidor (403/400). Opciones:
 *  - editar: autor o ADMIN, solo BORRADOR/PUBLICADO (ESTADOS_EDITABLES).
 *  - solicitar-revisión: autor, BORRADOR.
 *  - aprobar/publicar: ADMIN (PENDIENTE / BORRADOR directo).
 *  - rechazar: ADMIN, PENDIENTE (con motivo).
 *  - archivar: autor o ADMIN, PUBLICADO.
 */
export function accionesPermitidas(input: {
  rol: Rol | null;
  esAutor: boolean;
  estado: EstadoComunicado;
}): AccionesComunicado {
  const { rol, esAutor, estado } = input;
  if (!rol) return NADA;

  const esAdmin = rol === 'ADMIN';
  const puedeEscribir = esAdmin || (rol === 'COMUNICADOR' && esAutor);
  if (!puedeEscribir) return NADA;

  const estadosEditables = estado === 'BORRADOR' || estado === 'PUBLICADO';

  return {
    puedeEditar: estadosEditables,
    puedeSolicitarRevision: esAutor && estado === 'BORRADOR',
    puedeAprobar: esAdmin && estado === 'PENDIENTE',
    puedeRechazar: esAdmin && estado === 'PENDIENTE',
    puedePublicar: esAdmin && estado === 'BORRADOR',
    puedeArchivar: (esAutor || esAdmin) && estado === 'PUBLICADO',
  };
}
