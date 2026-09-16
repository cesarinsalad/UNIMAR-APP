import { api } from '@/shared/api/axios';
import type { Evento, FiltroEventos, TipoEvento } from '../types';

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

// ─── Escritura ─────────────────────────────────────────────────────────────

export interface InputEvento {
  titulo: string;
  descripcion: string | null;
  tipo: TipoEvento;
  inicioAt: string;
  finAt: string | null;
  diaCompleto: boolean;
  recordatorioMinutos: number | null;
  /** Solo OFICIAL; null en PERSONAL (el BFF lo aplica solo a oficiales). */
  decanatoIds: number[] | null;
}

export async function crearEvento(input: InputEvento): Promise<Evento> {
  const { data } = await api.post<Evento>('/eventos', {
    titulo: input.titulo,
    descripcion: input.descripcion,
    tipo: input.tipo,
    inicio_at: input.inicioAt,
    fin_at: input.finAt,
    dia_completo: input.diaCompleto,
    recordatorio_minutos: input.recordatorioMinutos,
    decanato_ids: input.decanatoIds ?? undefined,
  });
  return data;
}

/** PATCH /eventos/:id — nunca incluye `tipo` (el contrato lo prohíbe). */
export async function editarEvento(
  id: string,
  patch: Omit<Partial<InputEvento>, 'tipo'>,
): Promise<Evento> {
  const { data } = await api.patch<Evento>(`/eventos/${id}`, {
    titulo: patch.titulo,
    descripcion: patch.descripcion,
    inicio_at: patch.inicioAt,
    fin_at: patch.finAt,
    dia_completo: patch.diaCompleto,
    recordatorio_minutos: patch.recordatorioMinutos,
    decanato_ids: patch.decanatoIds,
  });
  return data;
}

/** DELETE /eventos/:id → 204. Solo dueño (personal) o ADMIN/comunicador creador (oficial). */
export async function eliminarEvento(id: string): Promise<void> {
  await api.delete(`/eventos/${id}`);
}
