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

/**
 * Espeja el formato real del wire de GET /notificaciones:
 * la capa HTTP del BFF serializa la entidad de dominio directamente
 * (camelCase). Los request bodies sí van en snake_case (lo que exige Zod).
 */
export interface Notificacion {
  id: string;
  usuarioId: string;
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo: string;
  referenciaId: string | null;
  leida: boolean;
  createdAt: string;
}

export type Plataforma = 'android' | 'ios' | 'web';

/** Espeja el formato real del wire de /dispositivos (camelCase, ver Notificación). */
export interface Dispositivo {
  id: string;
  usuarioId: string;
  pushToken: string;
  plataforma: Plataforma;
  registradoAt: string;
  ultimoUsoAt: string | null;
}