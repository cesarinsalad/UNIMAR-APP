import { SafeAreaView, StyleSheet } from 'react-native';

import { colors, spacing } from '@/shared/ui';
import { NotificacionesList } from '@/features/notificaciones/components/NotificacionesList';

export default function NotificacionesScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <NotificacionesList />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.base,
    paddingHorizontal: 0,
    paddingTop: spacing.two,
  },
});