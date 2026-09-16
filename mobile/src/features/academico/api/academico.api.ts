import { api } from '@/shared/api/axios';
import type { MateriaDTO, PerfilAcademico } from '../types';

/** GET /academico/perfil — identidad académica del dueño del JWT. */
export async function getPerfil(): Promise<PerfilAcademico> {
  const { data } = await api.get<PerfilAcademico>('/academico/perfil');
  return data;
}

export interface FiltroMaterias {
  /** Período institucional (ej. "2025-2"). Se omite si no se pasa. */
  periodo?: string;
}

/**
 * GET /academico/materias[?periodo=] — el BFF valida el periodo con Zod
 * (string 1–20), por eso se omite cuando no se filtra.
 */
export async function listarMaterias(filtro: FiltroMaterias = {}): Promise<MateriaDTO[]> {
  const { data } = await api.get<MateriaDTO[]>('/academico/materias', {
    params: filtro.periodo ? { periodo: filtro.periodo } : undefined,
  });
  return data;
}

export async function obtenerMateria(id: string): Promise<MateriaDTO> {
  const { data } = await api.get<MateriaDTO>(`/academico/materias/${id}`);
  return data;
}
