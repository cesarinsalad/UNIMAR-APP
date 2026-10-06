import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { spacing, radius, colors } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';
import { chipEstado, etiquetaAudiencia } from '../helpers';
import { usePortada } from '../hooks/usePortada';
import type { Comunicado } from '../types';

const FORMATO_FECHA = new Intl.DateTimeFormat('es-VE', { dateStyle: 'long' });

export function ComunicadoCard({
  comunicado,
  showEstado = false,
}: {
  comunicado: Comunicado;
  /** En mis.tsx: muestra el chip de estado (línea de audiencia se mantiene). */
  showEstado?: boolean;
}) {
  function abrir() {
    router.push(`/comunicados/${comunicado.id}` as Parameters<typeof router.push>[0]);
  }

  const chip = showEstado ? chipEstado(comunicado.estado) : null;
  const portada = usePortada(comunicado.id, comunicado.imagenPath !== null);
  const conPortada = comunicado.imagenPath !== null;

  return (
    <Pressable onPress={abrir} accessibilityRole="button">
      <ThemedView variant="card" style={styles.card}>
        {conPortada ? <BannerPortada url={portada.url} /> : null}
        <View style={styles.contenido}>
          <ThemedText variant="caption" tone="tertiary">
            {etiquetaAudiencia(comunicado.decanatoIds)}
          </ThemedText>
          {chip ? (
            <ThemedText variant="caption" weight="semibold">
              {chip}
            </ThemedText>
          ) : null}
          <ThemedText variant="bodyLg" weight="semibold" numberOfLines={2}>
            {comunicado.titulo}
          </ThemedText>
          <ThemedText variant="body" tone="secondary" numberOfLines={conPortada ? 3 : 5}>
            {comunicado.cuerpo}
          </ThemedText>
          {comunicado.publicadoAt ? (
            <ThemedText variant="caption" tone="tertiary">
              {FORMATO_FECHA.format(new Date(comunicado.publicadoAt))}
            </ThemedText>
          ) : null}
        </View>
      </ThemedView>
    </Pressable>
  );
}

/**
 * Banner 3:2 de la portada, full-bleed (cubre el padding superior/lateral
 * del card: las esquinas del radius las recorta `overflow: hidden`).
 * Sin URL firmada todavía → placeholder azul superficie.
 */
function BannerPortada({ url }: { url?: string }) {
  return (
    <View style={styles.banner}>
      {url ? (
        <Image source={{ uri: url }} style={styles.imagen} resizeMode="cover" />
      ) : (
        <View style={[styles.imagen, styles.placeholder]} />
      )}
    </View>
  );
}

const BORDES_CARD = spacing.four; // padding del variant="card" (theme)

const styles = StyleSheet.create({
  card: {
    gap: spacing.two,
    overflow: 'hidden',
  },
  banner: {
    marginTop: -BORDES_CARD,
    marginHorizontal: -BORDES_CARD,
  },
  imagen: {
    width: '100%',
    aspectRatio: 3 / 2,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
  },
  placeholder: {
    backgroundColor: colors.brand.surfaceBlue,
  },
  contenido: { gap: spacing.two },
});
