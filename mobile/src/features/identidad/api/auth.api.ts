import { api } from '@/shared/api/axios';
import type { SesionActiva, Rol } from '../types';

export async function login(email: string, password: string): Promise<SesionActiva> {
  const { data } = await api.post<SesionActiva>('/auth/login', { email, password });
  return data;
}

export type { SesionActiva, Rol };