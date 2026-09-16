import { api } from '@/shared/api/axios';

/** Espejo del wire de GET /decanatos (BFF módulo Identidad). */
export interface Decanato {
  id: number;
  nombre: string;
}

export async function listarDecanatos(): Promise<Decanato[]> {
  const { data } = await api.get<Decanato[]>('/decanatos');
  return data;
}