import { useEffect, useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';

import { spacing } from '@/shared/ui';
import { PressableScale, Skeleton, ThemedText, ThemedView } from '@/shared/ui';
import { PortadaPlaceholder } from './PortadaPlaceholder';
import { fuenteImagen } from '../api/adjuntos.api';
import { estadoCargaPortada } from '../helpers';
import { usePortada } from '../hooks/usePortada';
import type { Comunicado } from '../types';

const FORMATO_FECHA = new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' });
const ANCHO = 240;

/**
 * Tarjeta de noticia del carrusel del Home: portada 3:2 (URL firmada si
 * hay imagenPath), título 2 líneas y fecha compacta. Ancho fijo (240) para
 * el scroll horizontal.
 */
export function NoticiaCard({
  comunicado,
  style,
}: {
  comunicado: Comunicado;
  style?: StyleProp<ViewStyle>;
}) {
  const portada = usePortada(comunicado.id, comunicado.imagenPath !== null);
  const [falloImagen, setFalloImagen] = useState(false);

  useEffect(() => {
    setFalloImagen(false);
  }, [portada.url]);

  function abrir() {
    router.push(`/comunicados/${comunicado.id}` as Parameters<typeof router.push>[0]);
  }

  const estadoPortada = estadoCargaPortada({
    url: portada.url,
    cargando: portada.cargando,
    fallo: falloImagen,
  });

  return (
    <PressableScale
      onPress={abrir}
      accessibilityRole="button"
      accessibilityLabel={comunicado.titulo}
      style={style}>
      <ThemedView variant="card" style={estilos.card}>
        <View style={estilos.banner}>
          {estadoPortada === 'imagen' && portada.url ? (
            <Image
              source={fuenteImagen(portada.url)}
              style={estilos.imagen}
              resizeMode="cover"
              onError={() => setFalloImagen(true)}
            />
          ) : estadoPortada === 'cargando' ? (
            <Skeleton testID="portada-skeleton" style={estilos.imagen} />
          ) : (
            <PortadaPlaceholder style={estilos.imagen} tamanoIcono={28} />
          )}
        </View>
        <View style={estilos.contenido}>
          <ThemedText variant="bodySm" weight="semibold" numberOfLines={2}>
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
  imagen: { width: '100%', aspectRatio: 3 / 2 },
  contenido: {
    padding: spacing.md,
    gap: spacing.xs,
  },
});
