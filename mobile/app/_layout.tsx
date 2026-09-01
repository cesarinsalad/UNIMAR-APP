import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';

import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { colors } from '@/shared/ui';
import { queryClient } from '@/shared/api/queryClient';
import { ensureCanalAndroid, registrarListenersPush } from '@/shared/notifications';

SplashScreen.preventAutoHideAsync().catch(() => {
  // El splash puede haber sido ocultado ya; continuar.
});

export default function RootLayout() {
  const hidratado = useSesionStore((s) => s.hidratado);
  const hydrate = useSesionStore((s) => s.hydrate);
  const [listenersActivos, setListenersActivos] = useState(false);

  useEffect(() => {
    void (async () => {
      await ensureCanalAndroid();
      await hydrate();
      setListenersActivos(true);
      await SplashScreen.hideAsync().catch(() => undefined);
    })();
  }, [hydrate]);

  useEffect(() => {
    if (!listenersActivos) return;
    const cleanup = registrarListenersPush();
    return cleanup;
  }, [listenersActivos]);

  if (!hidratado) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.white} />
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
              contentStyle: { backgroundColor: colors.background.base },
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
  root: { flex: 1, backgroundColor: colors.primary },
  splash: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});