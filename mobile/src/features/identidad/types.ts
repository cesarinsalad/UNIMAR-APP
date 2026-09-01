export type Rol = 'ESTUDIANTE' | 'COMUNICADOR' | 'ADMIN';

export const ROLES: readonly Rol[] = ['ESTUDIANTE', 'COMUNICADOR', 'ADMIN'] as const;

export const RANK_ROL: Record<Rol, number> = {
  ESTUDIANTE: 0,
  COMUNICADOR: 1,
  ADMIN: 2,
};

export interface Usuario {
  id: string;
  cedula: string;
  nombre: string;
  rol: Rol;
  decanato_id: number | null;
}

export interface SesionActiva {
  token: string;
  usuario: Usuario;
}

export interface PushDataPayload {
  tipo:
    | 'COMUNICADO_PUBLICADO'
    | 'COMUNICADO_RECHAZADO'
    | 'EVENTO_OFICIAL_CREADO'
    | 'EVENTO_RECORDATORIO'
    | 'NOTA_PUBLICADA';
  referencia_id: string;
}

export type { JwtClaims } from '@/shared/lib/jwt';