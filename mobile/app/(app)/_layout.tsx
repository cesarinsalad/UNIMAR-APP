import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Redirect, Stack, router, usePathname } from 'expo-router';

import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { usePermisos } from '@/features/identidad/hooks/usePermisos';
import { RegistrarDispositivoBoot } from '@/features/notificaciones/components/RegistrarDispositivoBoot';
import { CampanaConBadge } from '@/features/notificaciones/components/CampanaConBadge';
import { useNoLeidas } from '@/features/notificaciones/hooks/useNoLeidas';
import { tomarRutaPendiente } from '@/shared/notifications/pendingLink';
import { BarraInstitucional } from '@/shared/ui/BarraInstitucional';
import { colors, radius, spacing } from '@/shared/ui';
import { ThemedText } from '@/shared/ui/ThemedText';

export default function AppLayout() {
  const token = useSesionStore((s) => s.token);
  const totalNoLeidas = useNoLeidas();
  const permisos = usePermisos();
  const pathname = usePathname();
  // Oculto no solo dentro de la consola, sino también en los editores de
  // staff (los [id]/nuevo ya traen la acción "Editar" o su propio header,
  // y el botón duplicado quedaba encimado sobre esa capa).
  const enGestion = pathname.startsWith('/gestion');
  const enEditorStaff =
    pathname.startsWith('/comunicados/nuevo') || pathname.startsWith('/eventos/nuevo');

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
            <View style={estilos.accionesBarra}>
            {/* Gestión (COMUNICADOR/ADMIN): la puerta de la consola de
                staff. Se oculta dentro de la propia consola y de los
                editores (redundante). */}
            {permisos.puedeCrearComunicado && !enGestion && !enEditorStaff ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Panel de gestión"
                  onPress={() => router.push('/gestion' as never)}>
                  <View style={estilos.botonGestion}>
                    <ThemedText
                      variant="caption"
                      weight="semibold"
                      style={estilos.botonGestionTexto}>
                      Gestión
                    </ThemedText>
                  </View>
                </Pressable>
              ) : null}
              <CampanaConBadge
                total={totalNoLeidas.data?.total ?? 0}
                tono="azul"
                compacto
                tamano={20}
              />
            </View>
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
  accionesBarra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  // Botón "Gestión" sobre el azul de la barra: contorno blanco translúcido.
  botonGestion: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.one,
  },
  botonGestionTexto: { color: colors.text.onPrimary },
});