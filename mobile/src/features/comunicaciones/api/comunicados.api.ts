import { api } from '@/shared/api/axios';
import type { Comunicado, EstadoComunicado } from '../types';

export interface FiltroComunicados {
  estado?: EstadoComunicado;
  limit: number;
  offset: number;
}

/**
 * Query snake_case como el resto del contrato de request del BFF.
 * `estado` es un enum opcional de Zod: se omite si viene undefined.
 */
export async function listarComunicados(filtro: FiltroComunicados): Promise<Comunicado[]> {
  const { data } = await api.get<Comunicado[]>('/comunicados', {
    params: {
      estado: filtro.estado,
      limit: filtro.limit,
      offset: filtro.offset,
    },
  });
  return data;
}

export async function obtenerComunicado(id: string): Promise<Comunicado> {
  const { data } = await api.get<Comunicado>(`/comunicados/${id}`);
  return data;
}