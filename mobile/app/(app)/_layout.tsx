import { useEffect } from 'react';
import { Redirect, Stack, router } from 'expo-router';

import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { RegistrarDispositivoBoot } from '@/features/notificaciones/components/RegistrarDispositivoBoot';
import { tomarRutaPendiente } from '@/shared/notifications/pendingLink';

export default function AppLayout() {
  const token = useSesionStore((s) => s.token);

  useEffect(() => {
    // Este layout solo está montado si hay sesión, así que al consumir la
    // cola sabemos que la hidratación y el router ya están listos.
    const ruta = tomarRutaPendiente();
    if (!ruta) return;
    const t = setTimeout(() => {
      router.push(ruta as Parameters<typeof router.push>[0]);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  if (!token) {
    return <Redirect href="/login" />;
  }
  return (
    <>
      <RegistrarDispositivoBoot />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}