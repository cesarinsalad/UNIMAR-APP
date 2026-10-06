import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';

import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  useFonts,
} from '@expo-google-fonts/montserrat';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { colors } from '@/shared/ui';
import SplashLogo from '../assets/images/unimar/logo-vertical-blanco.png';
import { queryClient } from '@/shared/api/queryClient';
import {
  ensureCanalAndroid,
  prepararRutaInicial,
  registrarListenersPush,
} from '@/shared/notifications';

SplashScreen.preventAutoHideAsync().catch(() => {
  // El splash puede haber sido ocultado ya; continuar.
});

export default function RootLayout() {
  const hidratado = useSesionStore((s) => s.hidratado);
  const hydrate = useSesionStore((s) => s.hydrate);
  const [listenersActivos, setListenersActivos] = useState(false);
  const [fuenteCargada] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  useEffect(() => {
    if (!fuenteCargada) return;
    void (async () => {
      await ensureCanalAndroid();
      await hydrate();
      await prepararRutaInicial();
      setListenersActivos(true);
      await SplashScreen.hideAsync().catch(() => undefined);
    })();
  }, [hydrate, fuenteCargada]);

  useEffect(() => {
    if (!listenersActivos) return;
    const cleanup = registrarListenersPush();
    return cleanup;
  }, [listenersActivos]);

  if (!hidratado || !fuenteCargada) {
    // Réplica del splash nativo (Expo Go no permite boot splash custom):
    // fondo azul corporativo + logo vertical blanco centrado.
    return (
      <View style={styles.splash}>
        <Image source={SplashLogo} style={styles.splashLogo} resizeMode="contain" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg.canvas },
            }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brand.primary },
  splash: {
    flex: 1,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: { width: 256, height: 227 },
});