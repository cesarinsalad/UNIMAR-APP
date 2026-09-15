import { api } from '@/shared/api/axios';
import type { Notificacion, TipoNotificacion } from '../types';

export interface FiltroNotificaciones {
  soloNoLeidas: boolean;
  limit: number;
  offset: number;
}

/**
 * Paridad con listarNotificacionesQuerySchema del BFF (Zod):
 * - si soloNoLeidas es false se OMITE el query param: el backend usa
 *   z.coerce.boolean(), que con Boolean('false') evaluaría `true`.
 * - limit/offset van como números; Zod los coerciona.
 */
function queryBara(filtro: FiltroNotificaciones): Record<string, string | number> {
  const query: Record<string, string | number> = {
    limit: filtro.limit,
    offset: filtro.offset,
  };
  if (filtro.soloNoLeidas) {
    query.solo_no_leidas = 'true';
  }
  return query;
}

export async function listarNotificaciones(filtro: FiltroNotificaciones): Promise<Notificacion[]> {
  const { data } = await api.get<Notificacion[]>('/notificaciones', { params: queryBara(filtro) });
  return data;
}

export type { Notificacion, TipoNotificacion };