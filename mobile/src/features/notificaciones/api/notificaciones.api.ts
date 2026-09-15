import { api } from '@/shared/api/axios';
import type { Notificacion, TipoNotificacion } from '../types';

export interface FiltroNotificaciones {
  soloNoLeidas: boolean;
  limit: number;
  offset: number;
}

/**
 * Paridad con listarNotificacionesQuerySchema del BFF (Zod):
 * el endpoint valida `solo_no_leidas` como enum estricto 'true'|'false', así
 * que se envía solo cuando se filtra; si no, se omite y el default del
 * backend (false) aplica.
 */
function queryDeBandeja(filtro: FiltroNotificaciones): Record<string, string | number> {
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
  const { data } = await api.get<Notificacion[]>('/notificaciones', { params: queryDeBandeja(filtro) });
  return data;
}

/** GET /notificaciones/no-leidas → { total } (para el badge del tab). */
export async function contarNoLeidas(): Promise<{ total: number }> {
  const { data } = await api.get<{ total: number }>('/notificaciones/no-leidas');
  return data;
}

/** POST /notificaciones/:id/leer → la notificación actualizada. 404 si es ajena. */
export async function marcarNotificacionLeida(id: string): Promise<Notificacion> {
  const { data } = await api.post<Notificacion>(`/notificaciones/${id}/leer`);
  return data;
}

/** POST /notificaciones/leer-todas → { actualizadas }. */
export async function marcarTodasLeidas(): Promise<{ actualizadas: number }> {
  const { data } = await api.post<{ actualizadas: number }>('/notificaciones/leer-todas');
  return data;
}

export type { Notificacion, TipoNotificacion };