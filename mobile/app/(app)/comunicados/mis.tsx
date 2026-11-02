import { useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View as RNView,
  type ListRenderItemInfo,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  aprobarComunicado,
  rechazarComunicado,
} from '@/features/comunicaciones/api/comunicados.api';
import { ComunicadoCard } from '@/features/comunicaciones/components/ComunicadoCard';
import { ModalRechazo } from '@/features/comunicaciones/components/ModalRechazo';
import { useMisComunicados } from '@/features/comunicaciones/hooks/useMisComunicados';
import { useMutacionComunicado } from '@/features/comunicaciones/hooks/useMutacionComunicado';
import { usePermisos } from '@/features/identidad/hooks/usePermisos';
import { ApiError } from '@/shared/api/axios';
import { aplanarPaginas } from '@/shared/lib/paginar';
import { colors, layout, radius, spacing } from '@/shared/ui';
import { ThemedButton, ThemedText, ThemedView } from '@/shared/ui';
import type { Comunicado, EstadoComunicado } from '@/features/comunicaciones/types';

const CHIPS: { estado: EstadoComunicado; etiqueta: string }[] = [
  { estado: 'BORRADOR', etiqueta: 'Borradores' },
  { estado: 'PENDIENTE', etiqueta: 'Pendientes' },
  { estado: 'ARCHIVADO', etiqueta: 'Archivados' },
];

export default function MisComunicadosScreen() {
  const [estado, setEstado] = useState<EstadoComunicado>('BORRADOR');
  const insets = useSafeAreaInsets();
  const permisos = usePermisos();

  const query = useMisComunicados(estado);
  const comunicados = aplanarPaginas(query.data?.pages);

  // Cola "Por revisar": con PENDIENTE activo y rol ADMIN la RLS entrega la
  // cola global, y las acciones viven en cada fila (aprobar directo,
  // rechazar con motivo). El COMUNICADOR ve la misma pestaña como sus
  // pendientes, sin acciones.
  const colaRevision = estado === 'PENDIENTE' && permisos.puedeAprobar;

  const aprobar = useMutacionComunicado((id: string) => aprobarComunicado(id));
  const rechazar = useMutacionComunicado((input: { id: string; motivo: string }) =>
    rechazarComunicado(input.id, input.motivo),
  );
  const [errorFila, setErrorFila] = useState<string | null>(null);
  const [porRechazar, setPorRechazar] = useState<Comunicado | null>(null);

  async function aprobarFila(id: string) {
    setErrorFila(null);
    try {
      await aprobar.mutateAsync(id);
    } catch (e) {
      setErrorFila(
        e instanceof ApiError ? e.message : 'No se pudo aprobar. Verifica tu conexión.',
      );
    }
  }

  async function rechazarFila(id: string, motivo: string) {
    setErrorFila(null);
    try {
      await rechazar.mutateAsync({ id, motivo });
    } catch (e) {
      setErrorFila(
        e instanceof ApiError ? e.message : 'No se pudo rechazar. Verifica tu conexión.',
      );
    }
  }

  function renderItem({ item }: ListRenderItemInfo<Comunicado>) {
    if (!colaRevision) {
      return <ComunicadoCard comunicado={item} showEstado />;
    }
    return (
      <RNView>
        <ComunicadoCard comunicado={item} showEstado />
        <RNView style={estilos.accionesFila}>
          <ThemedButton
            title="Aprobar"
            variant="secondary"
            size="sm"
            onPress={() => void aprobarFila(item.id)}
          />
          <ThemedButton
            title="Rechazar"
            variant="ghost"
            size="sm"
            onPress={() => setPorRechazar(item)}
          />
        </RNView>
      </RNView>
    );
  }

  return (
    <ThemedView variant="base" style={estilos.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={estilos.chips}>
        {CHIPS.map((chip) => (
          <Pressable key={chip.estado} onPress={() => setEstado(chip.estado)}>
            <ThemedView
              variant={estado === chip.estado ? 'sunken' : 'elevated'}
              style={estilos.chip}>
              <ThemedText variant="caption" weight={estado === chip.estado ? 'semibold' : 'regular'}>
                {chip.etiqueta}
              </ThemedText>
            </ThemedView>
          </Pressable>
        ))}
      </ScrollView>

      {errorFila ? (
        <ThemedText variant="caption" style={estilos.errorTexto}>
          {errorFila}
        </ThemedText>
      ) : null}

      {query.isPending ? (
        <EstadoCentrado>
          <ThemedText tone="secondary">Cargando...</ThemedText>
        </EstadoCentrado>
      ) : query.isError ? (
        <EstadoCentrado gap>
          <ThemedText tone="secondary">No se pudo cargar la lista.</ThemedText>
          <ThemedButton title="Reintentar" variant="secondary" size="sm" onPress={() => query.refetch()} />
        </EstadoCentrado>
      ) : (
        <FlatList
          data={comunicados}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            estilos.contenido,
            { paddingBottom: insets.bottom + spacing.eight, alignSelf: 'center', width: '100%', maxWidth: layout.maxContentWidth },
          ]}
          ItemSeparatorComponent={Separador}
          ListEmptyComponent={
            colaRevision ? (
              <EstadoCentrado>
                <ThemedText variant="bodyLg" weight="semibold">
                  Cola limpia
                </ThemedText>
                <ThemedText tone="secondary">
                  No hay comunicados pendientes de revisión.
                </ThemedText>
              </EstadoCentrado>
            ) : (
              <EstadoCentrado>
                <ThemedText variant="bodyLg" weight="semibold">
                  Nada aquí
                </ThemedText>
                <ThemedText tone="secondary">
                  No hay comunicados en este estado.
                </ThemedText>
                <ThemedButton title="Crear comunicado" size="sm" onPress={() => router.push('/comunicados/nuevo')} />
              </EstadoCentrado>
            )
          }
          ListFooterComponent={query.isFetchingNextPage ? <PieDePagina /> : null}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) {
              void query.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.35}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}

      <RNView />

      <ModalRechazo
        visible={porRechazar !== null}
        cargando={rechazar.isPending}
        onCancelar={() => setPorRechazar(null)}
        onConfirmar={(motivo) => {
          const objetivo = porRechazar;
          setPorRechazar(null);
          if (objetivo) void rechazarFila(objetivo.id, motivo);
        }}
      />
    </ThemedView>
  );
}
// (El botón flotante de creación vive en el empty-state y en el tab.)

function EstadoCentrado({ children, gap = false }: { children: React.ReactNode; gap?: boolean }) {
  return (
    <ThemedView variant="base" style={[estilos.estado, gap && estilos.estadoConGap]}>
      {children}
    </ThemedView>
  );
}

function Separador() {
  return <RNView style={estilos.separador} />;
}

function PieDePagina() {
  return (
    <ThemedText variant="caption" tone="tertiary" style={estilos.footer}>
      Cargando más...
    </ThemedText>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  chips: {
    paddingHorizontal: spacing.four,
    paddingVertical: spacing.three,
    gap: spacing.two,
  },
  chip: {
    paddingHorizontal: spacing.three,
    paddingVertical: spacing.two,
    borderRadius: radius.pill,
  },
  errorTexto: {
    color: colors.status.danger,
    paddingHorizontal: spacing.four,
  },
  accionesFila: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.two,
    marginTop: spacing.two,
  },
  contenido: {
    padding: spacing.four,
    gap: spacing.three,
    backgroundColor: colors.background.base,
  },
  separador: {
    height: spacing.three,
  },
  estado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.six,
    gap: spacing.two,
  },
  estadoConGap: {
    gap: spacing.four,
  },
  footer: {
    textAlign: 'center',
    paddingVertical: spacing.four,
  },
});
