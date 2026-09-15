import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import { invalidarNotificaciones } from '@/features/notificaciones/api/notificaciones.api';
import type { PushDataPayload } from '@/features/identidad/types';
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

function navegarAPayload(payload: PushDataPayload | undefined): void {
  const ruta = rutaParaNotificacion(payload?.tipo, payload?.referencia_id);
  if (ruta) {
    router.push(ruta as Parameters<typeof router.push>[0]);
  }
}

export function registrarListenersPush(): () => void {
  // Push recibido con la app abierta: el banner lo muestra el handler de
  // módulo; aquí refrescamos bandeja y badge sin esperar a que el usuario
  // navegue.
  const recibida = Notifications.addNotificationReceivedListener(() => {
    invalidarNotificaciones();
  });

  const respondida = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as PushDataPayload | undefined;
    navegarAPayload(data);
    invalidarNotificaciones();
  });

  return () => {
    recibida.remove();
    respondida.remove();
  };
}

// Cold start (app cerrada → usuario tocó una notificación): el skeleton aún
// navega directo; la cola pendiente llega en el siguiente commit.
void Notifications.getLastNotificationResponseAsync().then((response) => {
  if (!response) return;
  const data = response.notification.request.content.data as PushDataPayload | undefined;
  setTimeout(() => {
    navegarAPayload(data);
  }, 0);
});

export async function ensureCanalAndroid(): Promise<void> {
  await Notifications.setNotificationChannelAsync('default', {
    name: 'UNIMARapp',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}