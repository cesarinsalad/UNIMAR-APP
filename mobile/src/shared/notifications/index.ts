import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

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
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as PushDataPayload | undefined;
    navegarAPayload(data);
  });

  void Notifications.getLastNotificationResponseAsync().then((response) => {
    if (!response) return;
    const data = response.notification.request.content.data as PushDataPayload | undefined;
    setTimeout(() => {
      navegarAPayload(data);
    }, 0);
  });

  return () => {
    subscription.remove();
  };
}

export async function ensureCanalAndroid(): Promise<void> {
  await Notifications.setNotificationChannelAsync('default', {
    name: 'UNIMARapp',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}