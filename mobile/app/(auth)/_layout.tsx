import { Redirect, Stack } from 'expo-router';

import { useSesionStore } from '@/features/identidad/store/sesion.store';

export default function AuthLayout() {
  const token = useSesionStore((s) => s.token);
  if (token) {
    return <Redirect href="/" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}