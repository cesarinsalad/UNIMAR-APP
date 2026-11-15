import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeftIcon } from 'phosphor-react-native';

import { useComunicadoDetalle } from '@/features/comunicaciones/hooks/useComunicadoDetalle';
import { AsistenteComunicado } from '@/features/comunicaciones/components/AsistenteComunicado';
import { BotonCircular } from '@/shared/ui/BotonCircular';
import { ThemedButton } from '@/shared/ui/ThemedButton';
import { ThemedText } from '@/shared/ui/ThemedText';
import { colors, spacing } from '@/shared/ui/theme';

export default function FormularioComunicadoScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const esEdicion = Boolean(id);
  const detalle = useComunicadoDetalle(id ?? 'sin-id', Boolean(id));
  const insets = useSafeAreaInsets();

  if (esEdicion && (detalle.isPending || detalle.isError)) {
    return (
      <View style={[estilos.pantalla, { paddingTop: insets.top }]}>
        <View style={estilos.cabecera}>
          <BotonCircular label="Volver" onPress={() => router.back()}>
            <ArrowLeftIcon size={20} color={colors.brand.primary} weight="bold" />
          </BotonCircular>
          <ThemedText variant="body" weight="semibold" style={estilos.titulo}>
            Editar comunicado
          </ThemedText>
          <View style={estilos.espacio} />
        </View>
        <View style={estilos.centro}>
          {detalle.isPending ? (
            <ThemedText tone="secondary">Cargando comunicado…</ThemedText>
          ) : (
            <>
              <ThemedText tone="secondary" style={estilos.mensaje}>
                No se pudo cargar el comunicado a editar.
              </ThemedText>
              <ThemedButton
                title="Reintentar"
                variant="secondary"
                size="sm"
                onPress={() => void detalle.refetch()}
              />
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <AsistenteComunicado
      key={id ?? 'nuevo'}
      id={id}
      datosIniciales={detalle.data ?? null}
    />
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.bg.surface,
  },
  cabecera: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  titulo: {
    flex: 1,
    textAlign: 'center',
  },
  espacio: {
    width: 40,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  mensaje: {
    textAlign: 'center',
  },
});
