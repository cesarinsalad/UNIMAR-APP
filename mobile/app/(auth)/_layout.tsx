import { Platform } from 'react-native';
import { Redirect, Stack } from 'expo-router';

import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { rutaInicioAutenticado } from '@/shared/lib/accesoWeb';

export default function AuthLayout() {
  const token = useSesionStore((s) => s.token);
  const rol = useSesionStore((s) => s.usuario?.rol ?? null);
  if (token) {
    return <Redirect href={rutaInicioAutenticado(rol, Platform.OS === 'web')} />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}