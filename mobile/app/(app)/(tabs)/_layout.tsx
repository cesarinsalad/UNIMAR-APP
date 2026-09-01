import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { colors, layout, spacing } from '@/shared/ui';
import { ThemedText } from '@/shared/ui';

function TabGlyph({ glyph }: { glyph: string }) {
  return (
    <ThemedText variant="caption" weight="bold">
      {glyph}
    </ThemedText>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.text.onPrimary,
        headerTitleStyle: { fontWeight: '600' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: {
          backgroundColor: colors.background.base,
          paddingBottom: Platform.OS === 'ios' ? layout.bottomTabInset : spacing.two,
          height: Platform.OS === 'ios' ? layout.bottomTabInset + 40 : 56,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: () => <TabGlyph glyph="H" />,
        }}
      />
      <Tabs.Screen
        name="comunicados"
        options={{
          title: 'Comunicados',
          tabBarIcon: () => <TabGlyph glyph="C" />,
        }}
      />
      <Tabs.Screen
        name="notificaciones"
        options={{
          title: 'Bandeja',
          tabBarIcon: () => <TabGlyph glyph="N" />,
        }}
      />
      <Tabs.Screen
        name="calendario"
        options={{
          title: 'Calendario',
          tabBarIcon: () => <TabGlyph glyph="K" />,
        }}
      />
      <Tabs.Screen
        name="academico"
        options={{
          title: 'Académico',
          tabBarIcon: () => <TabGlyph glyph="A" />,
        }}
      />
    </Tabs>
  );
}