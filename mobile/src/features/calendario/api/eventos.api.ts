import { api } from '@/shared/api/axios';
import type { Evento, FiltroEventos } from '../types';

/**
 * GET /eventos?desde=&hasta=&limit=&offset=
 * Query snake_case; el rango es obligatorio y el BFF rechaza >90 días.
 */
export async function listarEventos(filtro: FiltroEventos): Promise<Evento[]> {
  const { data } = await api.get<Evento[]>('/eventos', {
    params: {
      desde: filtro.desde,
      hasta: filtro.hasta,
      limit: filtro.limit,
      offset: filtro.offset,
    },
  });
  return data;
}

export async function obtenerEvento(id: string): Promise<Evento> {
  const { data } = await api.get<Evento>(`/eventos/${id}`);
  return data;
}
