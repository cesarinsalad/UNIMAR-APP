import { Image, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { colors, radius, spacing } from '@/shared/ui';
import { PressableScale, ThemedText } from '@/shared/ui';
import { haceRelativo, minutosLectura } from '@/shared/lib/tiempo';
import { EtiquetaCategoria } from './EtiquetaCategoria';
import { PortadaPlaceholder } from './PortadaPlaceholder';
import { usePortada } from '../hooks/usePortada';
import type { Comunicado } from '../types';

/**
 * Fila editorial de noticias (estilo portada de diario digital, imagen
 * institucional UNIMAR): miniatura 4:3 a la izquierda, categoría como
 * eyebrow mayúscula, titular bold de hasta 3 líneas y meta de tiempo en
 * línea propia bajo la fila. Sin card: la fila vive sobre el canvas y una
 * línea fina permanente separa los ítems.
 */
export function NoticiaCompacta({ comunicado }: { comunicado: Comunicado }) {
  const portada = usePortada(comunicado.id, comunicado.imagenPath !== null);

  function abrir() {
    router.push(`/comunicados/${comunicado.id}` as Parameters<typeof router.push>[0]);
  }

  return (
    <View style={estilos.fila}>
      <PressableScale
        onPress={abrir}
        accessibilityRole="button"
        accessibilityLabel={comunicado.titulo}
        style={estilos.contenido}>
        {portada.url ? (
          <Image source={{ uri: portada.url }} style={estilos.thumb} resizeMode="cover" />
        ) : (
          <PortadaPlaceholder style={estilos.thumb} tamanoIcono={20} />
        )}
        <View style={estilos.textos}>
          <EtiquetaCategoria
            comunicado={comunicado}
            mayusculas
            peso="medium"
            color="tinta"
          />
          <ThemedText variant="body" weight="bold" numberOfLines={3}>
            {comunicado.titulo}
          </ThemedText>
        </View>
      </PressableScale>
      <ThemedText variant="caption" tone="secondary" numberOfLines={1} style={estilos.meta}>
        {`${haceRelativo(comunicado.publicadoAt ?? comunicado.createdAt)} · ${minutosLectura(comunicado.cuerpo)} min de lectura`}
      </ThemedText>
    </View>
  );
}

/** 4:3 editorial. */
const TAM_THUMB_ANCHO = 88;
const TAM_THUMB_ALTO = 66;

const estilos = StyleSheet.create({
  fila: {
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.strong,
  },
  contenido: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  thumb: {
    width: TAM_THUMB_ANCHO,
    height: TAM_THUMB_ALTO,
    borderRadius: radius.sm,
  },
  textos: {
    flex: 1,
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  meta: {
    // Alinea con la columna de texto (miniatura + gap), como la portada.
    marginLeft: TAM_THUMB_ANCHO + spacing.md,
  },
});
