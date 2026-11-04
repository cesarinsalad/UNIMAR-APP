import { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MagnifyingGlassIcon, XIcon } from 'phosphor-react-native';

import {
  aprobarComunicado,
  rechazarComunicado,
} from '@/features/comunicaciones/api/comunicados.api';
import { ComunicadoCard } from '@/features/comunicaciones/components/ComunicadoCard';
import { ModalRechazo } from '@/features/comunicaciones/components/ModalRechazo';
import { chipEstado } from '@/features/comunicaciones/helpers';
import { useMisComunicados, totalDeCola } from '@/features/comunicaciones/hooks/useMisComunicados';
import {
  useTransicionComunicado,
} from '@/features/comunicaciones/hooks/useMutacionComunicado';
import { accionesPermitidas } from '@/features/comunicaciones/hooks/accionesPermitidas';
import { usePermisos } from '@/features/identidad/hooks/usePermisos';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { etiquetaAudiencia } from '@/shared/lib/etiquetas';
import { ApiError } from '@/shared/api/axios';
import { aplanarPaginas } from '@/shared/lib/paginar';
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue';
import { colors, radius, spacing } from '@/shared/ui';
import {
  Chip,
  EstadoCentrado,
  Separador,
  SeparadorFino,
  SkeletonCard,
  TextoError,
  ThemedButton,
  ThemedText,
  ThemedView,
  useEsDesktop,
} from '@/shared/ui';
import { FORMATO_FECHA_MEDIO } from '@/shared/lib/formatos';
import type { Comunicado, EstadoComunicado } from '@/features/comunicaciones/types';

const ESTADOS: { estado: EstadoComunicado; etiqueta: string }[] = [
  { estado: 'BORRADOR', etiqueta: 'Borradores' },
  { estado: 'PENDIENTE', etiqueta: 'Pendientes' },
  { estado: 'PUBLICADO', etiqueta: 'Publicados' },
  { estado: 'ARCHIVADO', etiqueta: 'Archivados' },
];

const CATEGORIAS_COLA: { valor: string; etiqueta: string }[] = [
  { valor: '', etiqueta: 'Todas' },
  { valor: 'ACADEMICO', etiqueta: 'Académico' },
  { valor: 'EVENTO', etiqueta: 'Eventos' },
  { valor: 'INSTITUCIONAL', etiqueta: 'Institucional' },
];

export interface ColasSeccionProps {
  /** El estado (BORRADOR/PENDIENTE/ARCHIVADO) lo dueña la consola. */
  estado: EstadoComunicado;
  onEstado: (estado: EstadoComunicado) => void;
}

/**
 * Colas de gestión: chips de estado + búsqueda server-side + chips de
 * categoría + lista (cards en móvil, tabla en desktop) con acciones inline
 * para el ADMIN en PENDIENTE (aprobar directo / rechazar con motivo).
 * Transiciones OPTIMISTAS: la fila sale al instante; si el BFF rechaza,
 * vuelve exactamente como estaba. La RLS decide el alcance.
 */
export function ColasSeccion({ estado, onEstado }: ColasSeccionProps) {
  const insets = useSafeAreaInsets();
  const esDesktop = useEsDesktop();
  const permisos = usePermisos();

  const [textoBusqueda, setTextoBusqueda] = useState('');
  const busqueda = useDebouncedValue(textoBusqueda.trim());
  const [categoria, setCategoria] = useState('');

  const query = useMisComunicados(estado, {
    q: busqueda || undefined,
    categoria: categoria || undefined,
  });
  const comunicados = aplanarPaginas(query.data?.pages);
  // Total exacto del BFF (count bajo RLS): "N en la cola" real, no cota.
  const totalCola = totalDeCola(query);

  // Cola "Por revisar": la RLS entrega la cola global al ADMIN y solo lo
  // propio al comunicador; las acciones bloquean el estado del card.
  const colaRevision = estado === 'PENDIENTE' && permisos.puedeAprobar;

  const aprobar = useTransicionComunicado<{ id: string }>((id) =>
    aprobarComunicado(id),
  );
  const rechazar = useTransicionComunicado<{ id: string; motivo: string }>(
    (id, motivo) => rechazarComunicado(id, motivo),
  );
  const [erroresFila, setErroresFila] = useState<Record<string, string>>({});
  const [filaEnVuelo, setFilaEnVuelo] = useState<string | null>(null);
  const [porRechazar, setPorRechazar] = useState<Comunicado | null>(null);
  const [errorRechazo, setErrorRechazo] = useState<string | null>(null);

  const ocupado = aprobar.isPending || rechazar.isPending;

  useEffect(() => {
    if (porRechazar === null) setErrorRechazo(null);
  }, [porRechazar]);

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
      await aprobar.mutateAsync({ id });
    } catch (e) {
      setErroresFila((prev) => ({
        ...prev,
        [id]: e instanceof ApiError ? e.message : 'No se pudo aprobar. Verifica tu conexión.',
      }));
    } finally {
      setFilaEnVuelo(null);
    }
  }

  /**
   * Rechazo SIN perder el motivo: el modal NO se cierra antes de saber el
   * desenlace. Si sale bien, se cierra (y el estado del comunicado vuelve a
   * BORRADOR con el motivo federado por la mutación optimista); si falla,
   * el modal permanece abierto con el texto intacto y el error mostrado.
   */
  async function confirmarRechazo(motivo: string) {
    const objetivo = porRechazar;
    if (!objetivo) return;
    limpiarErrorFila(objetivo.id);
    setFilaEnVuelo(objetivo.id);
    try {
      await rechazar.mutateAsync({ id: objetivo.id, motivo });
      setPorRechazar(null);
    } catch (e) {
      setErrorRechazo(
        e instanceof ApiError ? e.message : 'No se pudo rechazar. Verifica tu conexión.',
      );
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
      {/* Estado + contador en UNA fila fija (el conteo anclado a la derecha
          no cae a línea huérfana con flexWrap): la navegación y el "cuántos
          hay" comparten lectura. Fija (no ScrollView): altura intrínseca;
          el wrap absorbe anchos angostos sin estirar el contenedor. */}
      <View style={estilos.chips}>
        {ESTADOS.map((chip) => (
          <Chip
            key={chip.estado}
            etiqueta={chip.etiqueta}
            activa={estado === chip.estado}
            onPress={() => onEstado(chip.estado)}
          />
        ))}
        {/* Metadata que acompaña a la selección, no a la lista: el conteo
            exacto del BFF (count bajo RLS). Secundario, no terciario:
            es dato accionable (contraste ≥ 4.5:1). */}
        {!query.isPending && !query.isError ? (
          <ThemedText variant="caption" tone="secondary" style={estilos.totalCola}>
            {`${totalCola} en esta cola`}
          </ThemedText>
        ) : null}
      </View>

      {/* Búsqueda server-side (título O cuerpo del comunicado) + filtro por
          categoría. `q` min 1 → solo se envía con texto. */}
      <View style={estilos.filtros}>
        <View style={estilos.campoBusqueda}>
          <MagnifyingGlassIcon size={18} color={colors.text.tertiary} />
          <TextInput
            value={textoBusqueda}
            onChangeText={setTextoBusqueda}
            placeholder="Buscar en la cola..."
            placeholderTextColor={colors.text.secondary}
            autoCorrect={false}
            autoComplete="off"
            autoCapitalize="none"
            style={estilos.inputBusqueda}
            accessibilityLabel="Buscar en la cola"
          />
          {textoBusqueda.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
              hitSlop={spacing.three}
              style={estilos.botonLimpiar}
              onPress={() => setTextoBusqueda('')}>
              <XIcon size={16} color={colors.text.tertiary} />
            </Pressable>
          ) : null}
        </View>
        <View style={estilos.chipsCategoria}>
          {CATEGORIAS_COLA.map((chip) => (
            <Chip
              key={chip.valor}
              etiqueta={chip.etiqueta}
              activa={categoria === chip.valor}
              onPress={() => setCategoria(chip.valor)}
            />
          ))}
        </View>
      </View>

      {query.isPending ? (
        <EsqueletoCola esDesktop={esDesktop} />
      ) : query.isError ? (
        <EstadoCentrado gap>
          <TextoError>No se pudo cargar la cola.</TextoError>
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
            textoBusqueda || categoria ? (
              <EstadoCentrado>
                <ThemedText variant="bodyLg" weight="semibold">
                  Sin resultados
                </ThemedText>
                <ThemedText tone="secondary">
                  Ajusta la búsqueda o el filtro de categoría.
                </ThemedText>
              </EstadoCentrado>
            ) : colaRevision ? (
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
          ListFooterComponent={
            query.isFetchingNextPage || (query.isRefetching && query.hasNextPage) ? (
              <PieDePagina />
            ) : null
          }
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
              colors={[colors.brand.primary]}
              tintColor={colors.brand.primary}
            />
          }
        />
      )}

      <ModalRechazo
        visible={porRechazar !== null}
        cargando={filaEnVuelo === porRechazar?.id}
        error={errorRechazo ?? undefined}
        onCancelar={() => setPorRechazar(null)}
        onConfirmar={(motivo) => {
          void confirmarRechazo(motivo);
        }}
      />
    </ThemedView>
  );
}

/** Cargando marcado por estructura (~cards listada), no texto plano. */
function EsqueletoCola({ esDesktop }: { esDesktop: boolean }) {
  return (
    <View style={(esDesktop ? estilos.contenidoEsqueletoTabla : estilos.contenidoEsqueleto)}>
      {(esDesktop ? [0, 1, 2, 3, 4, 5] : [0, 1, 2]).map((f) => (
        <SkeletonCard key={f} largo={esDesktop ? 3 : 2} />
      ))}
    </View>
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
          {FORMATO_FECHA_MEDIO.format(new Date(comunicado.updatedAt))}
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
    backgroundColor: colors.bg.canvas,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: spacing.four,
    paddingTop: spacing.three,
    gap: spacing.two,
  },
  // Metadata fija al final de la fila de estado: shrink 0 — la fila puede
  // envolver los chips, el conteo jamás se queda (línea huérfana).
  totalCola: {
    fontVariant: ['tabular-nums'],
    marginLeft: 'auto',
    flexShrink: 0,
  },
  filtros: {
    paddingHorizontal: spacing.four,
    paddingTop: spacing.two,
    gap: spacing.two,
  },
  campoBusqueda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.two,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    paddingLeft: spacing.three,
    height: 44,
    backgroundColor: colors.background.base,
  },
  inputBusqueda: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    paddingVertical: 0,
  },
  // Blanco del input 36 + padding 8×2 = 52 ≥ 44 con el hitSlop.
  botonLimpiar: { padding: spacing.sm },
  chipsCategoria: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.two,
  },
  contenido: {
    padding: spacing.four,
    gap: spacing.three,
    backgroundColor: colors.bg.canvas,
  },
  contenidoTabla: {
    paddingHorizontal: spacing.four,
    paddingTop: spacing.one,
    gap: spacing.sm,
    backgroundColor: colors.bg.canvas,
  },
  contenidoEsqueleto: {
    padding: spacing.four,
  },
  contenidoEsqueletoTabla: {
    paddingHorizontal: spacing.four,
    paddingTop: spacing.one,
    gap: spacing.sm,
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
  footer: {
    textAlign: 'center',
    paddingVertical: spacing.four,
  },
});
