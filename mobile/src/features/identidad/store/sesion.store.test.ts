import { jest } from '@jest/globals';
import * as SecureStore from 'expo-secure-store';

import {
  BIOMETRIA_STORAGE_KEY,
  BIOMETRIA_TOKEN_KEY,
  TOKEN_STORAGE_KEY,
} from '@/shared/lib/constants';
import { queryClient } from '@/shared/api/queryClient';

jest.mock('@/shared/api/axios', () => ({
  api: { delete: jest.fn(async () => undefined) },
}));

jest.mock('@/shared/api/queryClient', () => ({
  queryClient: { clear: jest.fn() },
}));

jest.mock('@/shared/notifications/pendingLink', () => ({
  limpiarRutaPendiente: jest.fn(),
}));

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    canUseBiometricAuthentication: jest.fn(() => true),
  };
});

import { useSesionStore } from './sesion.store';

type MockedSecureStore = typeof SecureStore & {
  __store: Map<string, string>;
};

const mockedStore = SecureStore as unknown as MockedSecureStore;

function encodeBase64Url(json: string): string {
  return Buffer.from(json, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function crearTokenJwt(expOffsetSec = 3600): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = encodeBase64Url(
    JSON.stringify({
      sub: 'user-123',
      role: 'ESTUDIANTE',
      decanato_id: 1,
      nombre: 'Ana Pérez',
      iat: nowSec,
      exp: nowSec + expOffsetSec,
    }),
  );
  return `${header}.${payload}.firma`;
}

beforeEach(() => {
  mockedStore.__store.clear();
  jest.clearAllMocks();

  jest.mocked(SecureStore.getItemAsync).mockImplementation(
    async (key: string) => mockedStore.__store.get(key) ?? null,
  );
  jest.mocked(SecureStore.setItemAsync).mockImplementation(
    async (key: string, value: string) => {
      mockedStore.__store.set(key, value);
    },
  );
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key: string) => {
    mockedStore.__store.delete(key);
  });
  jest.mocked(SecureStore.canUseBiometricAuthentication).mockReturnValue(true);

  useSesionStore.setState({
    token: null,
    usuario: null,
    dispositivoId: null,
    pushDeshabilitado: false,
    biometriaActiva: false,
    bloqueadoPorBiometria: false,
    hidratado: false,
    loggingOut: false,
  });
});

describe('useSesionStore — seguridad biométrica', () => {
  it('activarBiometria cifra el token, guarda la bandera, borra el token plano y activa biometriaActiva', async () => {
    const token = crearTokenJwt();
    await useSesionStore.getState().setSesion(token);
    expect(mockedStore.__store.get(TOKEN_STORAGE_KEY)).toBe(token);

    const resultado = await useSesionStore.getState().activarBiometria();

    expect(resultado).toEqual({ ok: true });
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      BIOMETRIA_TOKEN_KEY,
      token,
      expect.objectContaining({ requireAuthentication: true }),
    );
    expect(mockedStore.__store.get(BIOMETRIA_TOKEN_KEY)).toBe(token);
    expect(mockedStore.__store.get(BIOMETRIA_STORAGE_KEY)).toBe('true');
    expect(mockedStore.__store.has(TOKEN_STORAGE_KEY)).toBe(false);
    expect(useSesionStore.getState().biometriaActiva).toBe(true);
    expect(useSesionStore.getState().bloqueadoPorBiometria).toBe(false);
  });

  it('activarBiometria sin soporte biométrico retorna no_disponible y mantiene biometriaActiva en false', async () => {
    const token = crearTokenJwt();
    await useSesionStore.getState().setSesion(token);
    jest.mocked(SecureStore.canUseBiometricAuthentication).mockReturnValue(false);

    const resultado = await useSesionStore.getState().activarBiometria();

    expect(resultado).toEqual({ ok: false, motivo: 'no_disponible' });
    expect(useSesionStore.getState().biometriaActiva).toBe(false);
    expect(mockedStore.__store.get(TOKEN_STORAGE_KEY)).toBe(token);
    expect(mockedStore.__store.has(BIOMETRIA_TOKEN_KEY)).toBe(false);
  });

  it('activarBiometria cancelado por el usuario limpia claves biométricas y retorna cancelado', async () => {
    const token = crearTokenJwt();
    await useSesionStore.getState().setSesion(token);
    jest
      .mocked(SecureStore.setItemAsync)
      .mockRejectedValueOnce(new Error('User canceled the authentication'));

    const resultado = await useSesionStore.getState().activarBiometria();

    expect(resultado).toEqual({ ok: false, motivo: 'cancelado' });
    expect(useSesionStore.getState().biometriaActiva).toBe(false);
    expect(mockedStore.__store.has(BIOMETRIA_STORAGE_KEY)).toBe(false);
    expect(mockedStore.__store.has(BIOMETRIA_TOKEN_KEY)).toBe(false);
    expect(mockedStore.__store.get(TOKEN_STORAGE_KEY)).toBe(token);
  });

  it('hydrate con bandera biométrica activa bloquea la app sin leer aún BIOMETRIA_TOKEN_KEY', async () => {
    const token = crearTokenJwt();
    mockedStore.__store.set(BIOMETRIA_STORAGE_KEY, 'true');
    mockedStore.__store.set(BIOMETRIA_TOKEN_KEY, token);

    await useSesionStore.getState().hydrate();

    const estado = useSesionStore.getState();
    expect(estado.token).toBeNull();
    expect(estado.usuario).toBeNull();
    expect(estado.biometriaActiva).toBe(true);
    expect(estado.bloqueadoPorBiometria).toBe(true);
    expect(estado.hidratado).toBe(true);
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(BIOMETRIA_STORAGE_KEY);
    expect(SecureStore.getItemAsync).not.toHaveBeenCalledWith(
      BIOMETRIA_TOKEN_KEY,
      expect.anything(),
    );
  });

  it('desbloquearConBiometria hidrata sesión si es válido, mantiene bloqueo si cancela y limpia si expiró', async () => {
    const tokenValido = crearTokenJwt(3600);
    mockedStore.__store.set(BIOMETRIA_STORAGE_KEY, 'true');
    mockedStore.__store.set(BIOMETRIA_TOKEN_KEY, tokenValido);
    await useSesionStore.getState().hydrate();

    // Caso 1: usuario cancela el prompt nativo
    jest
      .mocked(SecureStore.getItemAsync)
      .mockRejectedValueOnce(new Error('User canceled the authentication'));
    const resCancelado = await useSesionStore.getState().desbloquearConBiometria();
    expect(resCancelado).toBe('cancelado');
    expect(useSesionStore.getState().bloqueadoPorBiometria).toBe(true);
    expect(useSesionStore.getState().token).toBeNull();

    // Caso 2: verificación biométrica exitosa con token válido
    const resOk = await useSesionStore.getState().desbloquearConBiometria();
    expect(resOk).toBe('ok');
    expect(useSesionStore.getState().bloqueadoPorBiometria).toBe(false);
    expect(useSesionStore.getState().token).toBe(tokenValido);
    expect(useSesionStore.getState().usuario?.nombre).toBe('Ana Pérez');

    // Caso 3: token expirado en almacén biométrico
    const tokenExpirado = crearTokenJwt(-60);
    mockedStore.__store.set(BIOMETRIA_TOKEN_KEY, tokenExpirado);
    useSesionStore.getState().bloquearPorBiometria();
    const resExpirado = await useSesionStore.getState().desbloquearConBiometria();
    expect(resExpirado).toBe('expirado');
    expect(useSesionStore.getState().bloqueadoPorBiometria).toBe(false);
    expect(useSesionStore.getState().biometriaActiva).toBe(false);
    expect(useSesionStore.getState().token).toBeNull();
    expect(mockedStore.__store.has(BIOMETRIA_STORAGE_KEY)).toBe(false);
    expect(mockedStore.__store.has(BIOMETRIA_TOKEN_KEY)).toBe(false);
  });

  it('desactivarBiometria restaura TOKEN_STORAGE_KEY plano, borra claves biométricas y apaga biometriaActiva', async () => {
    const token = crearTokenJwt();
    await useSesionStore.getState().setSesion(token);
    await useSesionStore.getState().activarBiometria();

    expect(mockedStore.__store.has(TOKEN_STORAGE_KEY)).toBe(false);
    expect(useSesionStore.getState().biometriaActiva).toBe(true);

    await useSesionStore.getState().desactivarBiometria();

    expect(mockedStore.__store.get(TOKEN_STORAGE_KEY)).toBe(token);
    expect(mockedStore.__store.has(BIOMETRIA_STORAGE_KEY)).toBe(false);
    expect(mockedStore.__store.has(BIOMETRIA_TOKEN_KEY)).toBe(false);
    expect(useSesionStore.getState().biometriaActiva).toBe(false);
    expect(useSesionStore.getState().bloqueadoPorBiometria).toBe(false);
    expect(useSesionStore.getState().token).toBe(token);
  });

  it('bloquearPorBiometria limpia token y usuario de memoria y activa bloqueadoPorBiometria', async () => {
    const token = crearTokenJwt();
    await useSesionStore.getState().setSesion(token);
    await useSesionStore.getState().activarBiometria();

    useSesionStore.getState().bloquearPorBiometria();

    const estado = useSesionStore.getState();
    expect(estado.token).toBeNull();
    expect(estado.usuario).toBeNull();
    expect(estado.biometriaActiva).toBe(true);
    expect(estado.bloqueadoPorBiometria).toBe(true);
    expect(queryClient.clear).not.toHaveBeenCalled();
  });
});
