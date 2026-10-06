import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { Badge, ThemedButton, ThemedText, ThemedView } from '@/shared/ui';
import { colors, layout, radius, spacing } from '@/shared/ui';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { listarDecanatos } from '@/features/identidad/api/decanatos.api';

const ETIQUETA_ROL: Record<string, string> = {
  ESTUDIANTE: 'Estudiante',
  COMUNICADOR: 'Comunicador',
  ADMIN: 'Administrador',
};

export default function PerfilScreen() {
  const usuario = useSesionStore((s) => s.usuario);
  const logout = useSesionStore((s) => s.logout);
  const decanatos = useQuery({ queryKey: ['decanatos'], queryFn: listarDecanatos });

  const iniciales = (usuario?.nombre ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  const nombreDecanato = decanatos.data?.find((d) => d.id === usuario?.decanato_id)?.nombre;

  return (
    <ThemedView style={styles.pantalla}>
      <ThemedView variant="card" style={styles.tarjetaIdentidad}>
        <View style={styles.avatar}>
          <ThemedText variant="headline" weight="bold" tone="onPrimary">
            {iniciales || '?'}
          </ThemedText>
        </View>
        <ThemedText variant="title" weight="semibold" style={styles.nombre}>
          {usuario?.nombre ?? 'Sin sesión'}
        </ThemedText>
        <Badge label={ETIQUETA_ROL[usuario?.rol ?? ''] ?? '—'} />
        {nombreDecanato ? (
          <ThemedText variant="body" tone="secondary" style={styles.watermark}>
            {nombreDecanato}
          </ThemedText>
        ) : null}
      </ThemedView>

      <ThemedButton title="Cerrar sesión" variant="secondary" onPress={() => void logout()} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
    padding: spacing.lg,
    paddingBottom: layout.bottomTabInset,
    gap: spacing.xl,
  },
  tarjetaIdentidad: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nombre: { textAlign: 'center' },
  watermark: { textAlign: 'center' },
});
