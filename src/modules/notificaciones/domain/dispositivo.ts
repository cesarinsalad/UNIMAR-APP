/**
 * Entidad del dominio Notificaciones.
 *
 * Representa un dispositivo móvil del usuario donde la app puede recibir
 * notificaciones push. La PK del dispositivo existe para soportar múltiples
 * dispositivos por usuario (1:N); `push_token` es único en la app y es la
 * clave lógica usada por el proveedor de push (Expo).
 */
export const PLATAFORMAS = ['android', 'ios', 'web'] as const;
export type Plataforma = (typeof PLATAFORMAS)[number];

export interface Dispositivo {
  id: string;
  usuarioId: string;
  pushToken: string;
  plataforma: Plataforma;
  registradoAt: Date;
  ultimoUsoAt: Date | null;
}
