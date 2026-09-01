import { create } from 'zustand';

import { api } from '@/shared/api/axios';
import { TOKEN_STORAGE_KEY } from '@/shared/lib/constants';
import { decodeJwt, expiresWithin, isExpired, type JwtClaims } from '@/shared/lib/jwt';
import { queryClient } from '@/shared/api/queryClient';
import type { Rol, Usuario } from '../types';

interface SesionState {
  token: string | null;
  usuario: Usuario | null;
  dispositivoId: string | null;
  pushDeshabilitado: boolean;
  hidratado: boolean;
  loggingOut: boolean;
}

interface SesionActions {
  hydrate: () => Promise<void>;
  setSesion: (token: string, dispositivoId?: string | null) => Promise<void>;
  setDispositivo: (id: string | null) => void;
  setPushDeshabilitado: (v: boolean) => void;
  logout: () => Promise<void>;
}

type SesionStore = SesionState & SesionActions;

function usuarioFromClaims(claims: JwtClaims): Usuario {
  return {
    id: claims.sub,
    cedula: '',
    nombre: claims.nombre,
    rol: claims.role,
    decanato_id: claims.decanato_id,
  };
}

async function persistToken(token: string): Promise<void> {
  const SecureStore = await import('expo-secure-store');
  await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token);
}

async function clearPersistedToken(): Promise<void> {
  const SecureStore = await import('expo-secure-store');
  await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
}

async function readPersistedToken(): Promise<string | null> {
  const SecureStore = await import('expo-secure-store');
  return SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
}

async function unregisterDeviceBestEffort(dispositivoId: string | null): Promise<void> {
  if (!dispositivoId) return;
  try {
    await api.delete(`/dispositivos/${dispositivoId}`);
  } catch {
    // Intencionalmente silencioso: la limpieza de sesión no depende del backend.
  }
}

export const useSesionStore = create<SesionStore>((set, get) => ({
  token: null,
  usuario: null,
  dispositivoId: null,
  pushDeshabilitado: false,
  hidratado: false,
  loggingOut: false,

  hydrate: async () => {
    if (get().hidratado) return;
    try {
      const token = await readPersistedToken();
      if (!token) {
        set({ hidratado: true });
        return;
      }
      const claims = decodeJwt(token);
      if (!claims) {
        await clearPersistedToken();
        set({ hidratado: true });
        return;
      }
      if (isExpired(claims)) {
        await clearPersistedToken();
        set({ hidratado: true });
        return;
      }
      if (expiresWithin(claims, 5 * 60 * 1000)) {
        // Expira en <5 min: lo dejamos pero forzaremos logout tras primer 401.
        // El interceptor atómico se encarga.
      }
      set({
        token,
        usuario: usuarioFromClaims(claims),
        hidratado: true,
      });
    } catch {
      set({ hidratado: true });
    }
  },

  setSesion: async (token: string, dispositivoId: string | null = null) => {
    const claims = decodeJwt(token);
    if (!claims) {
      throw new Error('Token inválido: claims no decodificables');
    }
    await persistToken(token);
    set({
      token,
      usuario: usuarioFromClaims(claims),
      dispositivoId,
      pushDeshabilitado: false,
      hidratado: true,
    });
  },

  setDispositivo: (id: string | null) => {
    set({ dispositivoId: id });
  },

  setPushDeshabilitado: (v: boolean) => {
    set({ pushDeshabilitado: v });
  },

  logout: async () => {
    if (get().loggingOut) return;
    set({ loggingOut: true });
    try {
      const { dispositivoId } = get();
      await unregisterDeviceBestEffort(dispositivoId);
      queryClient.clear();
      await clearPersistedToken();
      set({
        token: null,
        usuario: null,
        dispositivoId: null,
        pushDeshabilitado: false,
        loggingOut: false,
      });
    } catch {
      set({ loggingOut: false });
      throw new Error('No se pudo cerrar la sesión limpiamente');
    }
  },
}));

export type { Rol };