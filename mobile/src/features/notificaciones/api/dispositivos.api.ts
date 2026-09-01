import { api } from '@/shared/api/axios';
import type { Dispositivo, Plataforma } from '../types';

export async function registrarDispositivo(input: {
  push_token: string;
  plataforma: Plataforma;
}): Promise<Dispositivo> {
  const { data } = await api.post<Dispositivo>('/dispositivos', input);
  return data;
}

export async function listarDispositivos(): Promise<Dispositivo[]> {
  const { data } = await api.get<Dispositivo[]>('/dispositivos');
  return data;
}

export async function eliminarDispositivo(id: string): Promise<void> {
  await api.delete(`/dispositivos/${id}`);
}