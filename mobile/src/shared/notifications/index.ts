import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import { invalidarNotificaciones } from '@/features/notificaciones/api/notificaciones.api';
import type { PushDataPayload } from '@/features/identidad/types';
import { guardarRutaPendiente } from './pendingLink';
import { rutaParaNotificacion } from './rutas';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

export { rutaParaNotificacion } from './rutas';

// Guard contra doble navegación: el response listener en vivo y la promise
// tardía de getLastNotificationResponseAsync pueden recibir la MISMA acción
// del usuario. El primero que actúa fija la bandera.
let rutaInicialConsumida = false;

function navegarAPayload(payload: PushDataPayload | undefined): void {
  const ruta = rutaParaNotificacion(payload?.tipo, payload?.referencia_id);
  if (ruta) {
    router.push(ruta as Parameters<typeof router.push>[0]);
  }
}

export function registrarListenersPush(): () => void {
  // En web no hay push nativo: los listeners JS jamás dispararían.
  if (Platform.OS === 'web') return () => undefined;

  // Push recibido con la app abierta: el banner lo muestra el handler de
  // módulo; aquí refrescamos bandeja y badge sin esperar a que el usuario
  // navegue.
  const recibida = Notifications.addNotificationReceivedListener(() => {
    invalidarNotificaciones();
  });

  const respondida = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as PushDataPayload | undefined;
    const tieneRuta = rutaParaNotificacion(data?.tipo, data?.referencia_id) !== null;
    if (tieneRuta) {
      rutaInicialConsumida = true;
    }
    navegarAPayload(data);
    invalidarNotificaciones();
  });

  return () => {
    recibida.remove();
    respondida.remove();
  };
}

/**
 * Cold start (app cerrada → usuario tocó una notificación): extrae la
 * respuesta de arranque y guarda la ruta en la cola. NO navega aquí:
 * el consumo ocurre cuando la sesión está hidratada (layout de (app)) o
 * tras el login (pantalla de login).
 */
export async function prepararRutaInicial(): Promise<void> {
  // En web no hay notificaciones que lancen la app: no hay nada que recuperar.
  if (Platform.OS === 'web') return;
  let response: Awaited<ReturnType<typeof Notifications.getLastNotificationResponseAsync>> | null;
  try {
    response = await Notifications.getLastNotificationResponseAsync();
  } catch {
    return;
  }
  if (!response || rutaInicialConsumida) return;
  const data = response.notification.request.content.data as PushDataPayload | undefined;
  const ruta = rutaParaNotificacion(data?.tipo, data?.referencia_id);
  if (ruta) {
    rutaInicialConsumida = true;
    guardarRutaPendiente(ruta);
  }
}

export async function ensureCanalAndroid(): Promise<void> {
  // Los channels son concepto Android; en el resto de plataformas no hay nada que crear.
  if (Platform.OS !== 'android') return;
  // Sin key `sound`: el nativo aplica el sonido por defecto del sistema
  // (pasar 'default' dispara la validación customSoundExists y falla,
  // porque no es un archivo en el bundle).
  await Notifications.setNotificationChannelAsync('default', {
    name: 'UNIMARapp',
    importance: Notifications.AndroidImportance.HIGH,
  });
}