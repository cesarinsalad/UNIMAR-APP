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

// ─── Escritura (COMUNICADOR/ADMIN) ─────────────────────────────────────────

export interface InputComunicado {
  titulo: string;
  cuerpo: string;
  /** [] = GLOBAL (toda la universidad), solo válido para ADMIN. */
  decanatoIds: number[];
}

/** POST /comunicados (201). Zod cámara: decanato_ids en snake_case. */
export async function crearComunicado(input: InputComunicado): Promise<Comunicado> {
  const { data } = await api.post<Comunicado>('/comunicados', {
    titulo: input.titulo,
    cuerpo: input.cuerpo,
    decanato_ids: input.decanatoIds,
  });
  return data;
}

/** PATCH /comunicados/:id — todos los campos opcionales, mínimo uno. */
export async function editarComunicado(
  id: string,
  patch: Partial<InputComunicado>,
): Promise<Comunicado> {
  const { data } = await api.patch<Comunicado>(`/comunicados/${id}`, {
    titulo: patch.titulo,
    cuerpo: patch.cuerpo,
    decanato_ids: patch.decanatoIds,
  });
  return data;
}

/** Transiciones de estado (BFF valida rol/estado con RBAC + reglas). */
export async function solicitarRevisionComunicado(id: string): Promise<Comunicado> {
  const { data } = await api.post<Comunicado>(`/comunicados/${id}/solicitar-revision`);
  return data;
}

export async function aprobarComunicado(id: string): Promise<Comunicado> {
  const { data } = await api.post<Comunicado>(`/comunicados/${id}/aprobar`, {});
  return data;
}

export async function rechazarComunicado(id: string, motivo: string): Promise<Comunicado> {
  const { data } = await api.post<Comunicado>(`/comunicados/${id}/rechazar`, { motivo });
  return data;
}

export async function publicarComunicado(id: string): Promise<Comunicado> {
  const { data } = await api.post<Comunicado>(`/comunicados/${id}/publicar`, {});
  return data;
}

export async function archivarComunicado(id: string): Promise<Comunicado> {
  const { data } = await api.post<Comunicado>(`/comunicados/${id}/archivar`);
  return data;
}