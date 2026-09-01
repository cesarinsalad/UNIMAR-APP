import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import type { PushDataPayload } from '@/features/identidad/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

function rutaParaPayload(payload: PushDataPayload | null): string | null {
  if (!payload) return null;
  switch (payload.tipo) {
    case 'COMUNICADO_PUBLICADO':
    case 'COMUNICADO_RECHAZADO':
      return `/comunicados/${payload.referencia_id}`;
    case 'EVENTO_OFICIAL_CREADO':
    case 'EVENTO_RECORDATORIO':
      return `/eventos/${payload.referencia_id}`;
    case 'NOTA_PUBLICADA':
      return `/academico/materias/${payload.referencia_id}`;
  }
}

export function registrarListenersPush(): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as PushDataPayload | undefined;
    const ruta = rutaParaPayload(data ?? null);
    if (ruta) {
      router.push(ruta as Parameters<typeof router.push>[0]);
    }
  });

  void Notifications.getLastNotificationResponseAsync().then((response) => {
    if (!response) return;
    const data = response.notification.request.content.data as PushDataPayload | undefined;
    const ruta = rutaParaPayload(data ?? null);
    if (ruta) {
      setTimeout(() => {
        router.push(ruta as Parameters<typeof router.push>[0]);
      }, 0);
    }
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