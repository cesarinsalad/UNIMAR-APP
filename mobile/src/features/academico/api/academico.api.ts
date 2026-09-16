import { api } from '@/shared/api/axios';
import type { MateriaDTO, PensumDTO, PerfilAcademico } from '../types';

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

/**
 * GET /academico/pensum?carrera_id= — el param es OBLIGATORIO en el
 * contrato (string 1–50). El llamador pasa `perfil.carrera` (decisión 5c:
 * funciona con el mock, que devuelve eco; revisar con la API real UNIMAR).
 */
export async function getPensum(carreraId: string): Promise<PensumDTO> {
  const { data } = await api.get<PensumDTO>('/academico/pensum', {
    params: { carrera_id: carreraId },
  });
  return data;
}
