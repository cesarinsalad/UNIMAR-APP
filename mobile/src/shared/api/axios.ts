import axios, { type AxiosError } from 'axios';

import { API_BASE_URL } from '@/shared/lib/constants';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { queryClient } from './queryClient';

export interface ApiErrorBody {
  code: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly original: AxiosError;

  constructor(message: string, status: number, code: string, original: AxiosError) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.original = original;
  }
}

function unwrapError(error: AxiosError<{ error?: ApiErrorBody }>): ApiError {
  const status = error.response?.status ?? 0;
  const body = error.response?.data?.error;
  const code = body?.code ?? 'UNKNOWN_ERROR';
  const message = body?.message ?? error.message ?? 'Error de red';
  return new ApiError(message, status, code, error);
}

let logoutInFlight = false;
async function performAtomicLogout(): Promise<void> {
  if (logoutInFlight) return;
  logoutInFlight = true;
  try {
    await useSesionStore.getState().logout();
    queryClient.clear();
  } finally {
    logoutInFlight = false;
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useSesionStore.getState().token;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const payload = response.data as { data?: unknown } | undefined;
    if (payload && Object.prototype.hasOwnProperty.call(payload, 'data')) {
      response.data = payload.data;
    }
    return response;
  },
  (error: AxiosError<{ error?: ApiErrorBody }>) => {
    const status = error.response?.status;
    if (status === 401) {
      void performAtomicLogout();
    }
    return Promise.reject(unwrapError(error));
  },
);