import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';

import { spacing } from '@/shared/ui';
import { Badge, PressableScale, ThemedText, ThemedView } from '@/shared/ui';
import { etiquetaAudiencia } from '@/shared/lib/etiquetas';
import { PortadaPlaceholder } from './PortadaPlaceholder';
import { usePortada } from '../hooks/usePortada';
import type { Comunicado } from '../types';

const FORMATO_FECHA = new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' });
const ANCHO = 240;

/**
 * Tarjeta de noticia del carrusel del Home: portada 3:2 (URL firmada si
 * hay imagenPath), Badge de audiencia sobre la imagen, título 2 líneas y
 * fecha compacta. Ancho fijo (240) para el scroll horizontal.
 */
export function NoticiaCard({
  comunicado,
  style,
}: {
  comunicado: Comunicado;
  style?: StyleProp<ViewStyle>;
}) {
  const portada = usePortada(comunicado.id, comunicado.imagenPath !== null);

  function abrir() {
    router.push(`/comunicados/${comunicado.id}` as Parameters<typeof router.push>[0]);
  }

  return (
    <PressableScale
      onPress={abrir}
      accessibilityRole="button"
      accessibilityLabel={comunicado.titulo}
      style={style}>
      <ThemedView variant="card" style={estilos.card}>
        <View style={estilos.banner}>
          {portada.url ? (
            <Image source={{ uri: portada.url }} style={estilos.imagen} resizeMode="cover" />
          ) : (
            <PortadaPlaceholder style={estilos.imagen} tamanoIcono={28} />
          )}
          <View style={estilos.audiencia}>
            <Badge label={etiquetaAudiencia(comunicado.decanatoIds)} tone="info" />
          </View>
        </View>
        <View style={estilos.contenido}>
          <ThemedText variant="body" weight="semibold" numberOfLines={2}>
            {comunicado.titulo}
          </ThemedText>
          {comunicado.publicadoAt ? (
            <ThemedText variant="caption" tone="tertiary">
              {FORMATO_FECHA.format(new Date(comunicado.publicadoAt))}
            </ThemedText>
          ) : null}
        </View>
      </ThemedView>
    </PressableScale>
  );
}

const estilos = StyleSheet.create({
  card: {
    width: ANCHO,
    gap: 0,
    overflow: 'hidden',
    padding: 0,
  },
  banner: { position: 'relative' },
  imagen: { width: '100%', aspectRatio: 2 / 1 },
  audiencia: {
    position: 'absolute',
    left: spacing.sm,
    top: spacing.sm,
  },
  contenido: {
    padding: spacing.md,
    gap: spacing.xs,
  },
});
