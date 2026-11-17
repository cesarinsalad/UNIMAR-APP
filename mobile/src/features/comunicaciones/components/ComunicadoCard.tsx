import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { spacing, radius, colors } from '@/shared/ui';
import { Skeleton, ThemedText, ThemedView } from '@/shared/ui';
import { fuenteImagen } from '../api/adjuntos.api';
import { chipEstado, estadoCargaPortada, etiquetaAudiencia } from '../helpers';
import { usePortada } from '../hooks/usePortada';
import type { Comunicado } from '../types';

const FORMATO_FECHA = new Intl.DateTimeFormat('es-VE', { dateStyle: 'long' });

export function ComunicadoCard({
  comunicado,
  showEstado = false,
  bandaRevisora,
}: {
  comunicado: Comunicado;
  /** En mis.tsx: muestra el chip de estado (línea de audiencia se mantiene). */
  showEstado?: boolean;
  /** Consola: franja de revisión (aprobar/rechazar) al pie de ESTA tarjeta. */
  bandaRevisora?: React.ReactNode;
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
        {conPortada ? (
          <BannerPortada url={portada.url} cargando={portada.cargando} />
        ) : null}
        <View style={styles.contenido}>
          <ThemedText variant="caption" tone="tertiary">
            {etiquetaAudiencia(comunicado.decanatoIds)}
          </ThemedText>
          {chip ? (
            <ThemedText variant="caption" weight="semibold">
              {chip}
            </ThemedText>
          ) : null}
          {showEstado && comunicado.estado === 'BORRADOR' && comunicado.motivoRechazo ? (
            <ThemedText variant="caption" numberOfLines={2} style={styles.motivo}>
              Devuelto con motivo: {comunicado.motivoRechazo}
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
        {bandaRevisora ? <View style={styles.banda}>{bandaRevisora}</View> : null}
      </ThemedView>
    </Pressable>
  );
}

/**
 * Banner 3:2 de la portada, full-bleed (cubre el padding superior/lateral
 * del card: las esquinas del radius las recorta `overflow: hidden`).
 * Mientras llega la URL firmada se pinta un skeleton; sin portada o con la
 * imagen rota queda el fondo azul de superficie.
 */
function BannerPortada({ url, cargando }: { url?: string; cargando: boolean }) {
  const [falloImagen, setFalloImagen] = useState(false);

  useEffect(() => {
    setFalloImagen(false);
  }, [url]);

  const estado = estadoCargaPortada({ url, cargando, fallo: falloImagen });

  return (
    <View style={styles.banner}>
      {estado === 'imagen' && url ? (
        <Image
          source={fuenteImagen(url)}
          style={styles.imagen}
          resizeMode="cover"
          onError={() => setFalloImagen(true)}
        />
      ) : estado === 'cargando' ? (
        <Skeleton testID="portada-skeleton" style={styles.imagen} />
      ) : (
        <View style={[styles.imagen, styles.placeholder]} />
      )}
    </View>
  );
}

const BORDES_CARD = spacing.lg; // padding del variant="card" (theme)

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
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
  contenido: { gap: spacing.sm },
  motivo: { color: colors.status.danger },
  banda: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
});
