import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { api } from '@/shared/api/axios';
import {
  BIOMETRIA_STORAGE_KEY,
  BIOMETRIA_TOKEN_KEY,
  TOKEN_STORAGE_KEY,
} from '@/shared/lib/constants';
import { decodeJwt, expiresWithin, isExpired, type JwtClaims } from '@/shared/lib/jwt';
import { limpiarRutaPendiente } from '@/shared/notifications/pendingLink';
import { queryClient } from '@/shared/api/queryClient';
import type { Rol, Usuario } from '../types';

export type MotivoErrorBiometria = 'no_disponible' | 'cancelado' | 'error';

export type ResultadoActivarBiometria =
  | { ok: true }
  | { ok: false; motivo: MotivoErrorBiometria };

export type ResultadoDesbloqueoBiometrico = 'ok' | 'cancelado' | 'expirado';

const PROMPT_ACTIVAR_BIOMETRIA =
  'Confirma tu identidad para activar el ingreso biométrico';
const PROMPT_DESBLOQUEAR_BIOMETRIA =
  'Verifica tu identidad para ingresar a UNIMARapp';

// Evita que el diálogo biométrico del propio SO dispare el bloqueo al volver a 'active'.
let operacionBiometricaEnCurso = false;

export function estaOperacionBiometricaEnCurso(): boolean {
  return operacionBiometricaEnCurso;
}

interface SesionState {
  token: string | null;
  usuario: Usuario | null;
  dispositivoId: string | null;
  pushDeshabilitado: boolean;
  biometriaActiva: boolean;
  bloqueadoPorBiometria: boolean;
  hidratado: boolean;
  loggingOut: boolean;
}

interface SesionActions {
  hydrate: () => Promise<void>;
  setSesion: (token: string, dispositivoId?: string | null) => Promise<void>;
  setDispositivo: (id: string | null) => void;
  setPushDeshabilitado: (v: boolean) => void;
  activarBiometria: () => Promise<ResultadoActivarBiometria>;
  desactivarBiometria: () => Promise<void>;
  desbloquearConBiometria: () => Promise<ResultadoDesbloqueoBiometrico>;
  bloquearPorBiometria: () => void;
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

// SecureStore no existe en web (su build exporta un objeto vacío): en web
// el token persiste en localStorage — la plataforma de staff (escritura/
// revisión) vive en el navegador y recargar no debe desloguear. En nativo
// persiste cifrada entre arranques. localStorage puede lanzar en modos de
// navegación restringidos: se trata como "sin sesión recordada".
async function persistToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      // Sin persistencia: la sesión vive en memoria hasta recargar.
    }
    return;
  }
  await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token);
}

async function clearPersistedToken(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Nada recordado que limpiar.
    }
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
}

async function readPersistedToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
}

async function canUseBiometrics(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return Boolean(SecureStore.canUseBiometricAuthentication());
  } catch {
    return false;
  }
}

async function readBiometriaFlag(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return (await SecureStore.getItemAsync(BIOMETRIA_STORAGE_KEY)) === 'true';
  } catch {
    return false;
  }
}

async function clearBiometriaStorage(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await SecureStore.deleteItemAsync(BIOMETRIA_STORAGE_KEY);
  } catch {
    // Best-effort.
  }
  try {
    await SecureStore.deleteItemAsync(BIOMETRIA_TOKEN_KEY, { requireAuthentication: true });
  } catch {
    // Best-effort.
  }
  try {
    await SecureStore.deleteItemAsync(BIOMETRIA_TOKEN_KEY);
  } catch {
    // Best-effort.
  }
}

function clasificarErrorBiometrico(err: unknown): MotivoErrorBiometria {
  const msg = err instanceof Error ? err.message : String(err);
  if (/cancel|user canceled|negative_button|errSecUserCanceled|-128/i.test(msg)) {
    return 'cancelado';
  }
  if (/no biometric|no hardware|unavailable|not enrolled|biometryNotEnrolled|biometryNotAvailable/i.test(msg)) {
    return 'no_disponible';
  }
  return 'error';
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
  biometriaActiva: false,
  bloqueadoPorBiometria: false,
  hidratado: false,
  loggingOut: false,

  hydrate: async () => {
    if (get().hidratado) return;
    try {
      if (Platform.OS !== 'web' && (await readBiometriaFlag())) {
        if (!(await canUseBiometrics())) {
          await clearBiometriaStorage();
          await clearPersistedToken();
          set({ biometriaActiva: false, bloqueadoPorBiometria: false, hidratado: true });
          return;
        }
        set({
          token: null,
          usuario: null,
          biometriaActiva: true,
          bloqueadoPorBiometria: true,
          hidratado: true,
        });
        return;
      }

      const token = await readPersistedToken();
      if (!token) {
        set({ biometriaActiva: false, bloqueadoPorBiometria: false, hidratado: true });
        return;
      }
      const claims = decodeJwt(token);
      if (!claims) {
        await clearPersistedToken();
        set({ biometriaActiva: false, bloqueadoPorBiometria: false, hidratado: true });
        return;
      }
      if (isExpired(claims)) {
        await clearPersistedToken();
        set({ biometriaActiva: false, bloqueadoPorBiometria: false, hidratado: true });
        return;
      }
      if (expiresWithin(claims, 5 * 60 * 1000)) {
        // Expira en <5 min: lo dejamos pero forzaremos logout tras primer 401.
        // El interceptor atómico se encarga.
      }
      set({
        token,
        usuario: usuarioFromClaims(claims),
        biometriaActiva: false,
        bloqueadoPorBiometria: false,
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
    // El estado se actualiza ANTES de persistir: las queries del (app) que
    // arrancan tras el login nunca ven el token viejo de SecureStore (ventana
    // que causaba 401 + rebote a login). Si la app muere antes de persistir,
    // la sesión solo no queda recordada; sin efecto negativo.
    set({
      token,
      usuario: usuarioFromClaims(claims),
      dispositivoId,
      pushDeshabilitado: false,
      biometriaActiva: false,
      bloqueadoPorBiometria: false,
      hidratado: true,
    });
    await clearBiometriaStorage();
    await persistToken(token);
  },

  setDispositivo: (id: string | null) => {
    set({ dispositivoId: id });
  },

  setPushDeshabilitado: (v: boolean) => {
    set({ pushDeshabilitado: v });
  },

  activarBiometria: async () => {
    const { token } = get();
    if (Platform.OS === 'web' || !token) {
      return { ok: false, motivo: 'no_disponible' };
    }
    if (!(await canUseBiometrics())) {
      return { ok: false, motivo: 'no_disponible' };
    }
    operacionBiometricaEnCurso = true;
    try {
      await SecureStore.setItemAsync(BIOMETRIA_TOKEN_KEY, token, {
        requireAuthentication: true,
        authenticationPrompt: PROMPT_ACTIVAR_BIOMETRIA,
      });
      // En iOS, SecItemAdd no dispara Face ID / Touch ID al escribir sino al leer.
      if (Platform.OS === 'ios') {
        await SecureStore.getItemAsync(BIOMETRIA_TOKEN_KEY, {
          requireAuthentication: true,
          authenticationPrompt: PROMPT_ACTIVAR_BIOMETRIA,
        });
      }
      await SecureStore.setItemAsync(BIOMETRIA_STORAGE_KEY, 'true');
      await clearPersistedToken();
      set({ biometriaActiva: true, bloqueadoPorBiometria: false });
      return { ok: true };
    } catch (err) {
      await clearBiometriaStorage();
      return { ok: false, motivo: clasificarErrorBiometrico(err) };
    } finally {
      operacionBiometricaEnCurso = false;
    }
  },

  desactivarBiometria: async () => {
    const { token } = get();
    if (token) {
      await persistToken(token);
    }
    await clearBiometriaStorage();
    set({ biometriaActiva: false, bloqueadoPorBiometria: false });
  },

  desbloquearConBiometria: async () => {
    if (Platform.OS === 'web') return 'expirado';
    operacionBiometricaEnCurso = true;
    try {
      const token = await SecureStore.getItemAsync(BIOMETRIA_TOKEN_KEY, {
        requireAuthentication: true,
        authenticationPrompt: PROMPT_DESBLOQUEAR_BIOMETRIA,
      });
      if (!token) {
        await clearBiometriaStorage();
        await clearPersistedToken();
        set({
          token: null,
          usuario: null,
          biometriaActiva: false,
          bloqueadoPorBiometria: false,
        });
        return 'expirado';
      }
      const claims = decodeJwt(token);
      if (!claims || isExpired(claims)) {
        await clearBiometriaStorage();
        await clearPersistedToken();
        set({
          token: null,
          usuario: null,
          biometriaActiva: false,
          bloqueadoPorBiometria: false,
        });
        return 'expirado';
      }
      set({
        token,
        usuario: usuarioFromClaims(claims),
        biometriaActiva: true,
        bloqueadoPorBiometria: false,
      });
      return 'ok';
    } catch {
      return 'cancelado';
    } finally {
      operacionBiometricaEnCurso = false;
    }
  },

  bloquearPorBiometria: () => {
    if (Platform.OS === 'web' || operacionBiometricaEnCurso) return;
    const { biometriaActiva, token, bloqueadoPorBiometria } = get();
    if (biometriaActiva && token && !bloqueadoPorBiometria) {
      set({ token: null, usuario: null, bloqueadoPorBiometria: true });
    }
  },

  logout: async () => {
    if (get().loggingOut) return;
    set({ loggingOut: true });
    try {
      const { dispositivoId } = get();
      await unregisterDeviceBestEffort(dispositivoId);
      queryClient.clear();
      // Un deep-link del usuario saliente no abre contenido al que inicie
      // sesión después (privacidad entre usuarios del mismo dispositivo).
      limpiarRutaPendiente();
      await clearBiometriaStorage();
      await clearPersistedToken();
      set({
        token: null,
        usuario: null,
        dispositivoId: null,
        pushDeshabilitado: false,
        biometriaActiva: false,
        bloqueadoPorBiometria: false,
        loggingOut: false,
      });
    } catch {
      set({ loggingOut: false });
      throw new Error('No se pudo cerrar la sesión limpiamente');
    }
  },
}));

export type { Rol };