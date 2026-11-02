import { StyleSheet, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import {
  CalendarPlusIcon,
  CaretRightIcon,
  MegaphoneIcon,
} from 'phosphor-react-native';

import { useMisComunicados } from '@/features/comunicaciones/hooks/useMisComunicados';
import { etiquetaConteo } from '@/features/comunicaciones/hooks/contadores';
import { PAGE_SIZE_COMUNICADOS } from '@/features/comunicaciones/hooks/useComunicadosFeed';
import { aplanarPaginas } from '@/shared/lib/paginar';
import { usePermisos } from '@/features/identidad/hooks/usePermisos';
import { colors, spacing } from '@/shared/ui';
import { ContenidoCentrado, IconTile, PressableCard, SectionHeader, ThemedText, ThemedView } from '@/shared/ui';
import type { EstadoComunicado } from '@/features/comunicaciones/types';

export interface PanelSeccionProps {
  /** Deep-link interno: activa la cola del estado pedido. */
  onIrColas: (estado: EstadoComunicado) => void;
  onIrEventos: () => void;
}

/**
 * Panel de la consola de staff: lanzador de publicación (nuevo comunicado/
 * evento) y contadores con acceso a las colas. El conteo se calcula con la
 * primera página del hook de gestión; página llena → "N+" (la API no
 * expone total). Sección, no pantall: el cambio lo maneja la consola.
 */
export function PanelSeccion({ onIrColas, onIrEventos }: PanelSeccionProps) {
  const permisos = usePermisos();

  const borradores = useMisComunicados('BORRADOR');
  const pendientes = useMisComunicados('PENDIENTE');
  const archivados = useMisComunicados('ARCHIVADO');

  function conteo(query: ReturnType<typeof useMisComunicados>): string {
    if (query.isPending) return '…';
    return etiquetaConteo(aplanarPaginas(query.data?.pages).length, PAGE_SIZE_COMUNICADOS);
  }

  const colas: { estado: EstadoComunicado; etiqueta: string; conteo: string; nota: string }[] = [
    {
      estado: 'BORRADOR',
      etiqueta: 'Borradores',
      conteo: conteo(borradores),
      nota: 'Solo tú los ves.',
    },
    {
      estado: 'PENDIENTE',
      etiqueta: permisos.esAdmin ? 'Por revisar' : 'Pendientes',
      conteo: conteo(pendientes),
      nota: permisos.esAdmin
        ? 'Tu cola es global: incluye a todos los comunicadores.'
        : 'Esperando el visto bueno del ADMIN.',
    },
    {
      estado: 'ARCHIVADO',
      etiqueta: 'Archivados',
      conteo: conteo(archivados),
      nota: 'Publicados que se retiraron del feed.',
    },
  ];

  return (
    <ThemedView variant="base" style={estilos.pane}>
      <ScrollView
        contentContainerStyle={[
          estilos.scroll,
          { paddingBottom: spacing.four + spacing.eight },
        ]}
        showsVerticalScrollIndicator={false}>
        <ContenidoCentrado>
          <SectionHeader title="Publicar" />
          <View style={estilos.tiles}>
            <IconTile
              label="Nuevo comunicado"
              icono={MegaphoneIcon}
              onPress={() => router.push('/comunicados/nuevo' as never)}
              style={estilos.tile}
            />
            <IconTile
              label="Nuevo evento"
              icono={CalendarPlusIcon}
              onPress={() => router.push('/eventos/nuevo' as never)}
              style={estilos.tile}
            />
          </View>

          <SectionHeader title="Comunicados" />
          <View style={estilos.colas}>
            {colas.map((cola) => (
              <PressableCard
                key={cola.estado}
                accessibilityRole="button"
                accessibilityLabel={`${cola.etiqueta}: ${cola.conteo}`}
                onPress={() => onIrColas(cola.estado)}
                style={estilos.colaCard}>
                <View style={estilos.colaTextos}>
                  <ThemedText variant="body" weight="semibold">
                    {cola.etiqueta}
                  </ThemedText>
                  <ThemedText variant="caption" tone="secondary">
                    {cola.nota}
                  </ThemedText>
                </View>
                <View style={estilos.colaDerecha}>
                  <ThemedText variant="headline" weight="bold" style={estilos.colaConteo}>
                    {cola.conteo}
                  </ThemedText>
                  <CaretRightIcon size={16} color={colors.text.tertiary} />
                </View>
              </PressableCard>
            ))}
          </View>

          <SectionHeader title="Eventos" />
          <PressableCard
            accessibilityRole="button"
            accessibilityLabel="Gestión de eventos"
            onPress={onIrEventos}
            style={estilos.colaCard}>
            <View style={estilos.colaTextos}>
              <ThemedText variant="body" weight="semibold">
                Gestión de eventos
              </ThemedText>
              <ThemedText variant="caption" tone="secondary">
                Editar o eliminar los tuyos (próximos 90 días).
              </ThemedText>
            </View>
            <CaretRightIcon size={16} color={colors.text.tertiary} />
          </PressableCard>

          <ThemedView variant="card" style={estilos.ayudaCard}>
            <ThemedText variant="bodySm" tone="secondary">
              El ciclo editorial:{' '}
              <ThemedText variant="bodySm" weight="semibold">
                borrador → revisión → publicación
              </ThemedText>
              . El ADMIN aprueba o devuelve los pendientes con un motivo; el
              autor corrige y vuelve a solicitar.
            </ThemedText>
          </ThemedView>
        </ContenidoCentrado>
      </ScrollView>
    </ThemedView>
  );
}

const estilos = StyleSheet.create({
  pane: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  scroll: {
    padding: spacing.four,
    gap: spacing.md,
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tile: {
    flex: 1,
  },
  colas: {
    gap: spacing.md,
  },
  colaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.four,
    gap: spacing.md,
  },
  colaTextos: {
    flex: 1,
    gap: 2,
  },
  colaDerecha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  colaConteo: {
    color: colors.brand.primary,
  },
  ayudaCard: {
    gap: spacing.xs,
  },
});
