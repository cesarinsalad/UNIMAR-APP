import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { colors, radius, spacing } from '@/shared/ui';
import { Badge, ThemedText, ThemedView } from '@/shared/ui';
import { haceRelativo, minutosLectura } from '@/shared/lib/tiempo';
import { etiquetaCategoria } from '../helpers';
import { usePortada } from '../hooks/usePortada';
import type { Comunicado } from '../types';

/**
 * Fila de "últimas noticias" del feed: thumbnail cuadrada redondeada (64)
 * a la izquierda + Badge de categoría, título 2 líneas y meta relativo.
 */
export function NoticiaCompacta({ comunicado }: { comunicado: Comunicado }) {
  const portada = usePortada(comunicado.id, comunicado.imagenPath !== null);

  function abrir() {
    router.push(`/comunicados/${comunicado.id}` as Parameters<typeof router.push>[0]);
  }

  return (
    <Pressable onPress={abrir} accessibilityRole="button">
      <ThemedView variant="card" style={estilos.fila}>
        {portada.url ? (
          <Image source={{ uri: portada.url }} style={estilos.thumb} resizeMode="cover" />
        ) : (
          <View style={[estilos.thumb, estilos.thumbPlaceholder]} />
        )}
        <View style={estilos.textos}>
          <Badge label={etiquetaCategoria(comunicado)} tone="info" />
          <ThemedText variant="body" weight="semibold" numberOfLines={2}>
            {comunicado.titulo}
          </ThemedText>
          <ThemedText variant="caption" tone="tertiary" numberOfLines={1}>
            {`${haceRelativo(comunicado.publicadoAt ?? comunicado.createdAt)} · ${minutosLectura(comunicado.cuerpo)} min`}
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

const TAM_THUMB = 64;

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  thumb: {
    width: TAM_THUMB,
    height: TAM_THUMB,
    borderRadius: radius.md,
  },
  thumbPlaceholder: { backgroundColor: colors.brand.surfaceBlue },
  textos: {
    flex: 1,
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
});
