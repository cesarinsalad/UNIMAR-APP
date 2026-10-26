import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect, Stack, router } from 'expo-router';

import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { RegistrarDispositivoBoot } from '@/features/notificaciones/components/RegistrarDispositivoBoot';
import { CampanaConBadge } from '@/features/notificaciones/components/CampanaConBadge';
import { useNoLeidas } from '@/features/notificaciones/hooks/useNoLeidas';
import { tomarRutaPendiente } from '@/shared/notifications/pendingLink';
import { BarraInstitucional } from '@/shared/ui/BarraInstitucional';

export default function AppLayout() {
  const token = useSesionStore((s) => s.token);
  const totalNoLeidas = useNoLeidas();

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
      <View style={estilos.col}>
        <BarraInstitucional
          action={
            <CampanaConBadge
              total={totalNoLeidas.data?.total ?? 0}
              tono="azul"
              compacto
              tamano={20}
            />
          }
        />
        <Stack
          screenOptions={{ headerShown: false }}
          screenLayout={({ children }) => (
            <View style={estilos.stack}>{children}</View>
          )}
        />
      </View>
    </>
  );
}

const estilos = StyleSheet.create({
  col: { flex: 1 },
  stack: { flex: 1 },
});