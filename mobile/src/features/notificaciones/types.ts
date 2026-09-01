export type TipoNotificacion =
  | 'COMUNICADO_PUBLICADO'
  | 'COMUNICADO_RECHAZADO'
  | 'EVENTO_OFICIAL_CREADO'
  | 'EVENTO_RECORDATORIO'
  | 'NOTA_PUBLICADA';

export const TIPOS_NOTIFICACION: readonly TipoNotificacion[] = [
  'COMUNICADO_PUBLICADO',
  'COMUNICADO_RECHAZADO',
  'EVENTO_OFICIAL_CREADO',
  'EVENTO_RECORDATORIO',
  'NOTA_PUBLICADA',
] as const;

export interface Notificacion {
  id: string;
  usuario_id: string;
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo: string;
  referencia_id: string | null;
  leida: boolean;
  created_at: string;
}

export type Plataforma = 'android' | 'ios' | 'web';

export interface Dispositivo {
  id: string;
  usuario_id: string;
  push_token: string;
  plataforma: Plataforma;
  registrado_at: string;
  ultimo_uso_at: string | null;
}