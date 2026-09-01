import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import type { Plataforma } from '@/features/notificaciones/types';

export function plataformaActual(): Plataforma {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

export type PermisoPush = 'concedido' | 'denegado' | 'indeterminado';

export async function consultarPermisoPush(): Promise<PermisoPush> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'concedido';
  if (status === 'denied') return 'denegado';
  return 'indeterminado';
}

export async function solicitarPermisoPush(): Promise<PermisoPush> {
  const actual = await consultarPermisoPush();
  if (actual !== 'indeterminado') return actual;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status === 'granted') return 'concedido';
  if (status === 'denied') return 'denegado';
  return 'indeterminado';
}

export interface ResultadoExpoPushToken {
  token: string | null;
  motivo:
    | 'ok'
    | 'permiso_denegado'
    | 'no_es_dispositivo_fisico'
    | 'error_expo'
    | 'proyecto_no_vinculado';
}

export async function obtenerExpoPushToken(): Promise<ResultadoExpoPushToken> {
  const permiso = await solicitarPermisoPush();
  if (permiso !== 'concedido') {
    return { token: null, motivo: 'permiso_denegado' };
  }

  if (!Device.isDevice) {
    return { token: null, motivo: 'no_es_dispositivo_fisico' };
  }

  try {
    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync();
    if (!expoPushToken || expoPushToken.length === 0) {
      return { token: null, motivo: 'proyecto_no_vinculado' };
    }
    return { token: expoPushToken, motivo: 'ok' };
  } catch {
    return { token: null, motivo: 'error_expo' };
  }
}