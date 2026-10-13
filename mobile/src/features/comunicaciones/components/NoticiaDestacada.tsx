import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import { radius, spacing } from '@/shared/ui';
import { Badge, PressableScale, ThemedText, ThemedView } from '@/shared/ui';
import { haceRelativo, minutosLectura } from '@/shared/lib/tiempo';
import { etiquetaCategoria } from '../helpers';
import { PortadaPlaceholder } from './PortadaPlaceholder';
import { usePortada } from '../hooks/usePortada';
import type { Comunicado } from '../types';

/**
 * Tarjeta destacada del feed de noticias: imagen full-bleed con gradiente
 * oscuro en la base, Badge de categoría arriba y título + meta ("Hace 2
 * horas · 5 min de lectura") en blanco. Presionable → detalle.
 */
export function NoticiaDestacada({ comunicado }: { comunicado: Comunicado }) {
  const { width } = useWindowDimensions();
  const portada = usePortada(comunicado.id, comunicado.imagenPath !== null);

  function abrir() {
    router.push(`/comunicados/${comunicado.id}` as Parameters<typeof router.push>[0]);
  }

  return (
    <PressableScale
      onPress={abrir}
      accessibilityRole="button"
      accessibilityLabel={comunicado.titulo}>
      <ThemedView variant="card" style={estilos.card}>
        {portada.url ? (
          <Image
            source={{ uri: portada.url }}
            style={[estilos.imagen, { height: width * 0.6 }]}
            resizeMode="cover"
          />
        ) : (
          <PortadaPlaceholder
            style={[estilos.imagen, { height: width * 0.6 }]}
            tamanoIcono={44}
          />
        )}
        <View style={estilos.badge}>
          <Badge label={etiquetaCategoria(comunicado)} tone="info" />
        </View>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.85)']}
          style={estilos.gradiente}
        />
        <View style={estilos.contenido}>
          <ThemedText variant="subtitle" weight="bold" tone="onPrimary" numberOfLines={2}>
            {comunicado.titulo}
          </ThemedText>
          <ThemedText variant="caption" tone="onPrimary" style={estilos.meta}>
            {`${haceRelativo(comunicado.publicadoAt ?? comunicado.createdAt)} · ${minutosLectura(comunicado.cuerpo)} min de lectura`}
          </ThemedText>
        </View>
      </ThemedView>
    </PressableScale>
  );
}

const estilos = StyleSheet.create({
  card: {
    padding: 0,
    gap: 0,
    overflow: 'hidden',
    borderRadius: radius.card,
  },
  imagen: { width: '100%' },
  badge: { position: 'absolute', left: spacing.lg, top: spacing.lg, zIndex: 2 },
  gradiente: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  contenido: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    gap: spacing.xs,
  },
  meta: { opacity: 0.85 },
});
