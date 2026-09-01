import { Redirect, Stack } from 'expo-router';

import { useSesionStore } from '@/features/identidad/store/sesion.store';

export default function AppLayout() {
  const token = useSesionStore((s) => s.token);
  if (!token) {
    return <Redirect href="/login" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}