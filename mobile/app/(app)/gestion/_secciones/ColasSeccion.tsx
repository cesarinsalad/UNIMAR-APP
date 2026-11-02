import { useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
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
import { chipEstado } from '@/features/comunicaciones/helpers';
import { useMisComunicados } from '@/features/comunicaciones/hooks/useMisComunicados';
import { useMutacionComunicado } from '@/features/comunicaciones/hooks/useMutacionComunicado';
import { accionesPermitidas } from '@/features/comunicaciones/hooks/accionesPermitidas';
import { usePermisos } from '@/features/identidad/hooks/usePermisos';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { etiquetaAudiencia } from '@/shared/lib/etiquetas';
import { ApiError } from '@/shared/api/axios';
import { aplanarPaginas } from '@/shared/lib/paginar';
import { colors, spacing } from '@/shared/ui';
import { Chip, ThemedButton, ThemedText, ThemedView, useEsDesktop } from '@/shared/ui';
import type { Comunicado, EstadoComunicado } from '@/features/comunicaciones/types';

const ESTADOS: { estado: EstadoComunicado; etiqueta: string }[] = [
  { estado: 'BORRADOR', etiqueta: 'Borradores' },
  { estado: 'PENDIENTE', etiqueta: 'Pendientes' },
  { estado: 'ARCHIVADO', etiqueta: 'Archivados' },
];

const FORMATO_FECHA = new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' });

export interface ColasSeccionProps {
  /** El estado (BORRADOR/PENDIENTE/ARCHIVADO) lo dueña la consola. */
  estado: EstadoComunicado;
  onEstado: (estado: EstadoComunicado) => void;
}

/**
 * Colas de gestión: chips de estado + lista (cards en móvil, tabla en
 * desktop) con acciones inline para el ADMIN en PENDIENTE (aprobar directo
 * / rechazar con motivo). La RLS decide el alcance: ADMIN ve la cola
 * global del estado; comunicador lo suyo.
 */
export function ColasSeccion({ estado, onEstado }: ColasSeccionProps) {
  const insets = useSafeAreaInsets();
  const esDesktop = useEsDesktop();
  const permisos = usePermisos();

  const query = useMisComunicados(estado);
  const comunicados = aplanarPaginas(query.data?.pages);

  // Cola "Por revisar": la RLS entrega la cola global al ADMIN y solo lo
  // propio al comunicador; las acciones bloquean el estado del card.
  const colaRevision = estado === 'PENDIENTE' && permisos.puedeAprobar;

  const aprobar = useMutacionComunicado((id: string) => aprobarComunicado(id));
  const rechazar = useMutacionComunicado((input: { id: string; motivo: string }) =>
    rechazarComunicado(input.id, input.motivo),
  );
  const [erroresFila, setErroresFila] = useState<Record<string, string>>({});
  const [filaEnVuelo, setFilaEnVuelo] = useState<string | null>(null);
  const [porRechazar, setPorRechazar] = useState<Comunicado | null>(null);

  const ocupado = aprobar.isPending || rechazar.isPending;

  function limpiarErrorFila(id: string) {
    setErroresFila((prev) => {
      if (!(id in prev)) return prev;
      const { [id]: _descartado, ...resto } = prev;
      return resto;
    });
  }

  async function aprobarFila(id: string) {
    limpiarErrorFila(id);
    setFilaEnVuelo(id);
    try {
      await aprobar.mutateAsync(id);
    } catch (e) {
      setErroresFila((prev) => ({
        ...prev,
        [id]: e instanceof ApiError ? e.message : 'No se pudo aprobar. Verifica tu conexión.',
      }));
    } finally {
      setFilaEnVuelo(null);
    }
  }

  async function rechazarFila(id: string, motivo: string) {
    limpiarErrorFila(id);
    setFilaEnVuelo(id);
    try {
      await rechazar.mutateAsync({ id, motivo });
    } catch (e) {
      setErroresFila((prev) => ({
        ...prev,
        [id]: e instanceof ApiError ? e.message : 'No se pudo rechazar. Verifica tu conexión.',
      }));
    } finally {
      setFilaEnVuelo(null);
    }
  }

  function abrirDetalle(comunicado: Comunicado) {
    router.navigate(`/comunicados/${comunicado.id}` as never);
  }

  function renderItem({ item }: ListRenderItemInfo<Comunicado>) {
    return esDesktop ? (
      <FilaTabla
        comunicado={item}
        onAbrir={() => abrirDetalle(item)}
        puedeRevisar={colaRevision}
        ocupado={ocupado}
        onAprobar={() => void aprobarFila(item.id)}
        onRechazar={() => setPorRechazar(item)}
      />
    ) : (
      <ComunicadoCard
        comunicado={item}
        showEstado
        bandaRevisora={
          colaRevision ? (
            <FranjaRevision
              error={erroresFila[item.id]}
              ocupado={ocupado}
              enVuelo={filaEnVuelo === item.id}
              onAprobar={() => void aprobarFila(item.id)}
              onRechazar={() => setPorRechazar(item)}
            />
          ) : undefined
        }
      />
    );
  }

  return (
    <ThemedView variant="base" style={estilos.container}>
      {/* Fija (no ScrollView): altura intrínseca; el wrap absorbe anchos
          angostos sin estirar el contenedor. */}
      <View style={estilos.chips}>
        {ESTADOS.map((chip) => (
          <Chip
            key={chip.estado}
            etiqueta={chip.etiqueta}
            activa={estado === chip.estado}
            onPress={() => onEstado(chip.estado)}
          />
        ))}
      </View>

      {query.isPending ? (
        <EstadoCentrado>
          <ThemedText tone="secondary">Cargando...</ThemedText>
        </EstadoCentrado>
      ) : query.isError ? (
        <EstadoCentrado gap>
          <ThemedText tone="secondary">No se pudo cargar la cola.</ThemedText>
          <ThemedButton title="Reintentar" variant="secondary" size="sm" onPress={() => query.refetch()} />
        </EstadoCentrado>
      ) : (
        <FlatList
          data={comunicados}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            esDesktop ? estilos.contenidoTabla : estilos.contenido,
            { paddingBottom: insets.bottom + spacing.eight },
          ]}
          ItemSeparatorComponent={esDesktop ? SeparadorFino : Separador}
          ListHeaderComponent={esDesktop ? (
            <View style={estilos.cabeceraTabla}>
              <ThemedText variant="caption" tone="tertiary" style={estilos.colTitulo}>
                Título
              </ThemedText>
              <ThemedText variant="caption" tone="tertiary" style={estilos.colAutor}>
                Autor
              </ThemedText>
              <ThemedText variant="caption" tone="tertiary" style={estilos.colAudiencia}>
                Audiencia
              </ThemedText>
              <ThemedText variant="caption" tone="tertiary" style={estilos.colFecha}>
                Fecha
              </ThemedText>
            </View>
          ) : null}
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
                <ThemedButton title="Crear comunicado" size="sm" onPress={() => router.push('/comunicados/nuevo' as never)} />
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

/** Fila de la tabla desktop: columnas flex + acciones a la derecha. */
function FilaTabla({
  comunicado,
  onAbrir,
  puedeRevisar,
  ocupado,
  onAprobar,
  onRechazar,
}: {
  comunicado: Comunicado;
  onAbrir: () => void;
  puedeRevisar: boolean;
  ocupado: boolean;
  onAprobar: () => void;
  onRechazar: () => void;
}) {
  const usuario = useSesionStore((s) => s.usuario);
  const acciones = accionesPermitidas({
    rol: usuario?.rol ?? null,
    esAutor: comunicado.autorId === usuario?.id,
    estado: comunicado.estado,
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={comunicado.titulo}
      onPress={onAbrir}>
      <ThemedView variant="card" style={estilos.filaTabla}>
        <View style={estilos.colTitulo}>
          <ThemedText variant="bodySm" weight="semibold" numberOfLines={2}>
            {comunicado.titulo}
          </ThemedText>
          <ThemedText variant="caption" tone="secondary" numberOfLines={1}>
            {chipEstado(comunicado.estado) ?? 'Publicado'}
          </ThemedText>
          {comunicado.estado === 'BORRADOR' && comunicado.motivoRechazo ? (
            <ThemedText variant="caption" numberOfLines={1} style={estilos.motivo}>
              Devuelto: {comunicado.motivoRechazo}
            </ThemedText>
          ) : null}
        </View>
        <ThemedText variant="caption" tone="secondary" style={estilos.colAutor} numberOfLines={1}>
          {comunicado.autorNombre}
        </ThemedText>
        <ThemedText variant="caption" tone="secondary" style={estilos.colAudiencia} numberOfLines={1}>
          {etiquetaAudiencia(comunicado.decanatoIds)}
        </ThemedText>
        <ThemedText variant="caption" tone="tertiary" style={estilos.colFecha} numberOfLines={1}>
          {FORMATO_FECHA.format(new Date(comunicado.updatedAt))}
        </ThemedText>
        <View style={estilos.colAcciones}>
          {puedeRevisar && acciones.puedeAprobar ? (
            <>
              <ThemedButton title="Aprobar" variant="secondary" size="sm" disabled={ocupado} onPress={onAprobar} />
              <ThemedButton title="Rechazar" variant="ghost" size="sm" disabled={ocupado} onPress={onRechazar} />
            </>
          ) : (
            <ThemedButton title="Ver" variant="ghost" size="sm" onPress={onAbrir} />
          )}
        </View>
      </ThemedView>
    </Pressable>
  );
}

/**
 * Franja de revisión al pie de una tarjeta PENDIENTE en móvil: aprobar
 * directo o rechazar con motivo (ModalRechazo). El estado de vuelo es de
 * LA FILA en sí (spinner + deshabilitada); el error se ancla al pie de la
 * fila que falló, no en un banner global.
 */
function FranjaRevision({
  error,
  ocupado,
  enVuelo,
  onAprobar,
  onRechazar,
}: {
  error?: string;
  ocupado: boolean;
  enVuelo: boolean;
  onAprobar: () => void;
  onRechazar: () => void;
}) {
  return (
    <View style={estilos.bandaFila}>
      <View style={estilos.bandaBotones}>
        <ThemedButton
          title="Aprobar"
          variant="secondary"
          loading={enVuelo}
          disabled={ocupado}
          onPress={onAprobar}
          style={estilos.bandaBoton}
        />
        <ThemedButton
          title="Rechazar"
          variant="ghost"
          disabled={ocupado}
          onPress={onRechazar}
          style={estilos.bandaBoton}
        />
      </View>
      {error ? (
        <ThemedText variant="caption" style={estilos.bandaError}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

function EstadoCentrado({ children, gap = false }: { children: React.ReactNode; gap?: boolean }) {
  return (
    <ThemedView variant="base" style={[estilos.estado, gap && estilos.estadoConGap]}>
      {children}
    </ThemedView>
  );
}

function Separador() {
  return <View style={estilos.separador} />;
}

function SeparadorFino() {
  return <View style={estilos.separadorFino} />;
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.four,
    paddingVertical: spacing.three,
    gap: spacing.two,
  },
  contenido: {
    padding: spacing.four,
    gap: spacing.three,
    backgroundColor: colors.background.base,
  },
  contenidoTabla: {
    paddingHorizontal: spacing.four,
    paddingTop: spacing.one,
    gap: spacing.sm,
    backgroundColor: colors.background.base,
  },
  cabeceraTabla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.five,
    paddingBottom: spacing.xs,
  },
  filaTabla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.four,
  },
  colTitulo: { flex: 2, gap: 2 },
  colAutor: { flex: 1 },
  colAudiencia: { flex: 1 },
  colFecha: { width: 84 },
  colAcciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  motivo: { color: colors.status.danger },
  bandaFila: {
    gap: spacing.two,
  },
  bandaBotones: {
    flexDirection: 'row',
    gap: spacing.two,
  },
  bandaBoton: { flex: 1 },
  bandaError: { color: colors.status.danger },
  separador: { height: spacing.three },
  separadorFino: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
    marginHorizontal: spacing.four,
  },
  estado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.six,
    gap: spacing.two,
  },
  estadoConGap: { gap: spacing.four },
  footer: {
    textAlign: 'center',
    paddingVertical: spacing.four,
  },
});
