import { Redirect, Stack } from 'expo-router';

import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { RegistrarDispositivoBoot } from '@/features/notificaciones/components/RegistrarDispositivoBoot';

export default function AppLayout() {
  const token = useSesionStore((s) => s.token);
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