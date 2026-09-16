import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';

import { CuerpoMarkdown } from '@/features/comunicaciones/components/CuerpoMarkdown';
import { chipEstado, etiquetaAudiencia } from '@/features/comunicaciones/helpers';
import { useComunicadoDetalle } from '@/features/comunicaciones/hooks/useComunicadoDetalle';
import type { Comunicado } from '@/features/comunicaciones/types';
import { colors, radius, spacing } from '@/shared/ui';
import { ThemedButton, ThemedText, ThemedView } from '@/shared/ui';

const FORMATO_FECHA_LARGA = new Intl.DateTimeFormat('es-VE', {
  dateStyle: 'long',
  timeStyle: 'short',
});

export default function ComunicadoDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useComunicadoDetalle(id);

  return (
    <ThemedView variant="base" style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: query.data?.titulo ?? 'Comunicado',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.text.onPrimary,
          headerTitleStyle: { fontWeight: '600' },
        }}
      />

      {query.isPending ? (
        <Centrado>
          <ActivityIndicator color={colors.primary} />
        </Centrado>
      ) : query.isError ? (
        <Centrado gap>
          <ThemedText variant="subtitle" weight="semibold">
            {query.error instanceof Error && 'status' in query.error
              ? // 404: la audiencia cambió o el comunicado expiró/archivó
                'Este comunicado ya no está disponible.'
              : 'No se pudo cargar el comunicado.'}
          </ThemedText>
          <ThemedButton
            title="Volver"
            variant="ghost"
            onPress={() => query.refetch()}
          />
        </Centrado>
      ) : query.data ? (
        <Contenido comunicado={query.data} />
      ) : null}
    </ThemedView>
  );
}

function Contenido({ comunicado }: { comunicado: Comunicado }) {
  const chip = chipEstado(comunicado.estado);

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}>
      <ThemedText variant="headline" weight="bold">
        {comunicado.titulo}
      </ThemedText>

      <View style={styles.metaFila}>
        {chip ? (
          <ThemedView variant="elevated" style={styles.chip}>
            <ThemedText variant="caption" weight="semibold">
              {chip}
            </ThemedText>
          </ThemedView>
        ) : null}
        <ThemedText variant="caption" tone="secondary">
          {etiquetaAudiencia(comunicado.decanatoIds)}
        </ThemedText>
      </View>

      {comunicado.motivoRechazo ? (
        <ThemedView variant="card" style={[styles.motivoBox]}>
          <ThemedText variant="caption" weight="semibold">
            Motivo del rechazo
          </ThemedText>
          <ThemedText variant="body" tone="secondary">
            {comunicado.motivoRechazo}
          </ThemedText>
        </ThemedView>
      ) : null}

      <CuerpoMarkdown cuerpo={comunicado.cuerpo} />

      <View style={styles.footer}>
        <ThemedText variant="caption" tone="tertiary">
          {comunicado.publicadoAt
            ? `Publicado el ${FORMATO_FECHA_LARGA.format(new Date(comunicado.publicadoAt))}`
            : null}
          {comunicado.expiraAt && comunicado.estado !== 'ARCHIVADO'
            ? ` · Vigente hasta ${FORMATO_FECHA_LARGA.format(new Date(comunicado.expiraAt))}`
            : null}
        </ThemedText>
      </View>
    </ScrollView>
  );
}

function Centrado({
  children,
  gap = false,
}: {
  children: React.ReactNode;
  gap?: boolean;
}) {
  return (
    <ThemedView variant="base" style={[styles.centro, gap && styles.centroConGap]}>
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.six,
    gap: spacing.two,
  },
  centroConGap: {
    gap: spacing.four,
  },
  scroll: {
    padding: spacing.four,
    gap: spacing.three,
  },
  metaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.two,
    flexWrap: 'wrap',
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.two,
    paddingVertical: spacing.one,
    borderRadius: radius.sm,
    backgroundColor: colors.background.sunken,
  },
  motivoBox: {
    borderColor: colors.status.danger,
    borderWidth: 1,
    backgroundColor: colors.background.elevated,
  },
  footer: {
    marginTop: spacing.four,
  },
});