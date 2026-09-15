/**
 * Mapa único tipo de notificación → ruta internamente navegable.
 *
 * Lo consumen el handler de push (app abierta / muerta) y el tap sobre una
 * tarjeta de la bandeja, de modo que ambos flujos resuelven la misma
 * pantalla para el mismo tipo. Es una función pura (sin imports de Expo)
 * para poder testearla en Node.
 *
 * El `tipo` se acepta como string: llega de un payload push no confiable.
 * Devuelve null si falta la referencia o el tipo es desconocido: en ese caso
 * no se navega y la notificación sigue disponible en la bandeja.
 */
export function rutaParaNotificacion(
  tipo: string | undefined,
  referenciaId: string | null | undefined,
): string | null {
  if (!tipo || !referenciaId) return null;
  switch (tipo) {
    case 'COMUNICADO_PUBLICADO':
    case 'COMUNICADO_RECHAZADO':
      return `/comunicados/${referenciaId}`;
    case 'EVENTO_OFICIAL_CREADO':
    case 'EVENTO_RECORDATORIO':
      return `/eventos/${referenciaId}`;
    case 'NOTA_PUBLICADA':
      return `/academico/materias/${referenciaId}`;
    default:
      return null;
  }
}