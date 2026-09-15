import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { spacing } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';
import { etiquetaAudiencia } from '../helpers';
import type { Comunicado } from '../types';

const FORMATO_FECHA = new Intl.DateTimeFormat('es-VE', { dateStyle: 'long' });

export function ComunicadoCard({ comunicado }: { comunicado: Comunicado }) {
  function abrir() {
    router.push(`/comunicados/${comunicado.id}` as Parameters<typeof router.push>[0]);
  }

  return (
    <Pressable onPress={abrir} accessibilityRole="button">
      <ThemedView variant="card" style={styles.card}>
        <ThemedText variant="caption" tone="tertiary">
          {etiquetaAudiencia(comunicado.decanatoIds)}
        </ThemedText>
        <ThemedText variant="bodyLg" weight="semibold" numberOfLines={2}>
          {comunicado.titulo}
        </ThemedText>
        <ThemedText variant="body" tone="secondary" numberOfLines={5}>
          {comunicado.cuerpo}
        </ThemedText>
        {comunicado.publicadoAt ? (
          <ThemedText variant="caption" tone="tertiary">
            {FORMATO_FECHA.format(new Date(comunicado.publicadoAt))}
          </ThemedText>
        ) : null}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.two,
  },
});