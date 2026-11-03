import { useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Redirect, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';

import { useFonts } from 'expo-font';
import { evaluarAccesoWeb } from '@/shared/lib/accesoWeb';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { VistaSoloMovil } from '@/shared/ui/VistaSoloMovil';
import { colors } from '@/shared/ui';
import SplashLogo from '../assets/images/unimar/logo-vertical-blanco.png';
import { queryClient } from '@/shared/api/queryClient';
import {
  ensureCanalAndroid,
  prepararRutaInicial,
  registrarListenersPush,
} from '@/shared/notifications';

/**
 * Compuerta por plataforma en web (no toca nativo — el branch de
 * Platform.OS sale antes de llegar a la decisión; hook order estable en
 * ambas plataformas). La web es plataforma de staff: consola de Gestión
 * + su flujo editorial. Un estudiante que navega desde el navegador NO
 * ve el feed/tabs: pantalla "solo móvil". Un staff fuera de las rutas
 * de gestión rebota a la consola. La decisión la centraliza
 * evaluarAccesoWeb (tests propias en shared/lib/accesoWeb.test.ts).
 */
/** Resultado de la compuerta: qué renderiza el root en web. */
type VistaWeb = 'normal' | 'soloMovil' | 'irGestion';

function usarPuertaWeb(): VistaWeb {
  const usuario = useSesionStore((s) => s.usuario);
  const rutaActual = usePathname();
  if (Platform.OS !== 'web') return 'normal';
  switch (evaluarAccesoWeb(rutaActual, usuario?.rol ?? null)) {
    case 'bloquear':
      return 'soloMovil';
    case 'irGestion':
      return 'irGestion';
    default:
      return 'normal';
  }
}

export default function RootLayout() {
  const hidratado = useSesionStore((s) => s.hidratado);
  const hydrate = useSesionStore((s) => s.hydrate);
  const [listenersActivos, setListenersActivos] = useState(false);
  const [fuenteCargada] = useFonts({
    // TTFs locales (equivalentes a las variantes de @expo-google-fonts;
    // mismas keys para el theme). Viven en assets/ (no node_modules) para
    // que el export web no las coloque bajo rutas ignoradas por wrangler.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Montserrat_300Light: require('../assets/fonts/Montserrat_300Light.ttf'),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Montserrat_400Regular: require('../assets/fonts/Montserrat_400Regular.ttf'),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Montserrat_500Medium: require('../assets/fonts/Montserrat_500Medium.ttf'),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Montserrat_600SemiBold: require('../assets/fonts/Montserrat_600SemiBold.ttf'),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Montserrat_700Bold: require('../assets/fonts/Montserrat_700Bold.ttf'),
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

  // Web gate: al bloquear/redirigir, la pantalla/reenvío REEMPLAZA al Stack
  // (las pantallas de la app ni se montan). Nativo: siempre 'normal'.
  // La llamada va ARRIBA del early return del splash: es un hook compuesto
  // (useSesionStore + usePathname) y su orden de hooks debe ser estable en
  // todos los renders — abajo del return crasheaba con React #310 ("Rendered
  // more hooks than during the previous render") en cuanto hidrataba.
  const puerta = usarPuertaWeb();

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
          {puerta === 'soloMovil' ? (
            <VistaSoloMovil />
          ) : puerta === 'irGestion' ? (
            <Redirect href="/gestion" />
          ) : (
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg.canvas },
              }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
            </Stack>
          )}
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