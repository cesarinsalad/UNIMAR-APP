import { useMemo } from 'react';

import { useSesionStore } from '../store/sesion.store';
import { RANK_ROL, type Rol } from '../types';

export interface Permisos {
  puedeCrearComunicado: boolean;
  puedeAprobar: boolean;
  puedeRechazar: boolean;
  puedeArchivar: boolean;
  puedeCrearEventoOficial: boolean;
  esAdmin: boolean;
  esComunicador: boolean;
  esEstudiante: boolean;
}

const permisosDefaultInvitado: Permisos = {
  puedeCrearComunicado: false,
  puedeAprobar: false,
  puedeRechazar: false,
  puedeArchivar: false,
  puedeCrearEventoOficial: false,
  esAdmin: false,
  esComunicador: false,
  esEstudiante: false,
};

function construirPermisos(rol: Rol | null | undefined): Permisos {
  if (!rol) return permisosDefaultInvitado;
  const rank = RANK_ROL[rol];
  return {
    puedeCrearComunicado: rank >= RANK_ROL.COMUNICADOR,
    puedeAprobar: rank >= RANK_ROL.ADMIN,
    puedeRechazar: rank >= RANK_ROL.ADMIN,
    puedeArchivar: rank >= RANK_ROL.COMUNICADOR,
    puedeCrearEventoOficial: rank >= RANK_ROL.COMUNICADOR,
    esAdmin: rank >= RANK_ROL.ADMIN,
    esComunicador: rank >= RANK_ROL.COMUNICADOR,
    esEstudiante: rank >= RANK_ROL.ESTUDIANTE,
  };
}

export function usePermisos(): Permisos {
  const rol = useSesionStore((s) => s.usuario?.rol ?? null);
  return useMemo(() => construirPermisos(rol), [rol]);
}