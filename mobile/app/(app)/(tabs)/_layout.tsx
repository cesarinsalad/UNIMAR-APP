import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Tabs, router } from 'expo-router';
import {
  CalendarBlankIcon,
  GraduationCapIcon,
  HouseIcon,
  MegaphoneIcon,
  UserCircleIcon,
} from 'phosphor-react-native';

import { colors, elevation, radius, spacing } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/ThemedText';
import { CampanaConBadge } from '@/features/notificaciones/components/CampanaConBadge';
import { useNoLeidas } from '@/features/notificaciones/hooks/useNoLeidas';
import { usePermisos } from '@/features/identidad/hooks/usePermisos';

/** Contrato mínimo que consume el bar (evita deep-imports de internals). */
interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<
    string,
    {
      options: {
        title?: string;
        tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => ReactNode;
      };
    }
  >;
  navigation: { dispatch: (action: { type: string; payload?: object }) => void };
  insets: { bottom: number };
}

/** Tab bar flotante estilo Figma, 100% propia:
 *  pill blanca con márgenes e insets controlados, items centrados con
 *  Phosphor icons + label Montserrat. Reemplaza el bar default.
 *  Los iconos viven en el `tabBarIcon` de cada Tabs.Screen; el texto, en su
 *  `title`, de modo que el bar no depende del naming de rutas anidadas. */
function TabBarFlotante({ state, descriptors, navigation }: TabBarProps) {
  // Knob de posición vertical: `+ spacing.xs` es el aire sobre el home indicator.
  const bottom = Platform.OS === 'ios' ? spacing.xl : spacing.lg;

  return (
    <View style={[styles.tabBar, { bottom }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key] ?? {};
        const activo = index === state.index;
        const color = activo ? colors.brand.primary : colors.text.primary;
        const titulo = options?.title ?? route.name;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: activo }}
            accessibilityLabel={titulo}
            android_ripple={{ color: colors.brand.surfaceBlue }}
            onPress={() => navigation.dispatch({ type: 'JUMP_TO', payload: { name: route.name } })}
            style={styles.item}>
            {options?.tabBarIcon?.({ focused: activo, color, size: 26 })}
            <ThemedText variant="caption" weight={activo ? 'semibold' : 'medium'} style={{ color }}>
              {titulo}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const noLeidas = useNoLeidas();
  const totalNoLeidas = noLeidas.data?.total ?? 0;
  const permisos = usePermisos();

  return (
    <Tabs
      tabBar={(props) => <TabBarFlotante {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.brand.primary },
        headerTintColor: colors.text.onPrimary,
        headerTitleStyle: { fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          headerShown: false,
          tabBarIcon: ({ focused }) =>
            focused ? (
              <HouseIcon size={26} color={focused ? colors.brand.primary : colors.text.primary} weight="duotone" />
            ) : (
              <HouseIcon size={26} color={focused ? colors.brand.primary : colors.text.primary} weight="duotone" />
            ),
        }}
      />
      <Tabs.Screen
        name="comunicados"
        options={{
          title: 'Noticias',
          headerShown: false,
          tabBarIcon: ({ focused }) =>
            focused ? (
              <MegaphoneIcon size={26} color={focused ? colors.brand.primary : colors.text.primary} weight="duotone" />
            ) : (
              <MegaphoneIcon size={26} color={focused ? colors.brand.primary : colors.text.primary} weight="duotone" />
            ),
          headerRight: permisos.puedeCrearComunicado
            ? () => (
                <Pressable onPress={() => router.push('/comunicados/mis')}>
                  <ThemedText
                    variant="body"
                    weight="semibold"
                    tone="onPrimary"
                    style={{ paddingHorizontal: spacing.lg }}>
                    Gestionar
                  </ThemedText>
                </Pressable>
              )
            : undefined,
        }}
      />
      <Tabs.Screen
        name="academico"
        options={{
          title: 'Clases',
          headerShown: false,
          tabBarIcon: ({ focused }) =>
            focused ? (
              <GraduationCapIcon size={26} color={focused ? colors.brand.primary : colors.text.primary} weight="duotone" />
            ) : (
              <GraduationCapIcon size={26} color={focused ? colors.brand.primary : colors.text.primary} weight="duotone" />
            ),
        }}
      />
      <Tabs.Screen
        name="calendario"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ focused }) =>
            focused ? (
              <CalendarBlankIcon size={26} color={focused ? colors.brand.primary : colors.text.primary} weight="duotone" />
            ) : (
              <CalendarBlankIcon size={26} color={focused ? colors.brand.primary : colors.text.primary} weight="duotone" />
            ),
          headerRight: () => (
            <Pressable onPress={() => router.push('/eventos/nuevo')}>
              <ThemedText
                variant="body"
                weight="semibold"
                tone="onPrimary"
                style={{ paddingHorizontal: spacing.lg }}>
                + Evento
              </ThemedText>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) =>
            focused ? (
              <UserCircleIcon size={26} color={focused ? colors.brand.primary : colors.text.primary} weight="duotone" />
            ) : (
              <UserCircleIcon size={26} color={focused ? colors.brand.primary : colors.text.primary} weight="duotone" />
            ),
          headerRight: () => <CampanaConBadge total={totalNoLeidas} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    height: 72,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    borderRadius: radius.pill,
    backgroundColor: colors.bg.surface,
    overflow: 'hidden',
    ...elevation.md,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
});
