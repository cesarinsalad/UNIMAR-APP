import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  asignarPortada,
  crearComunicado,
  editarComunicado,
  quitarPortada,
  type InputComunicado,
} from '@/features/comunicaciones/api/comunicados.api';
import { seleccionarPortada } from '@/features/comunicaciones/api/portada.api';
import type { ArchivoAdjunto } from '@/features/comunicaciones/api/adjuntos.api';
import { subirAdjunto } from '@/features/comunicaciones/api/adjuntos.api';
import { usePortada } from '@/features/comunicaciones/hooks/usePortada';
import {
  clampAudiencia,
  tieneErrores,
  validarFormularioComunicado,
} from '@/features/comunicaciones/hooks/formulario';
import { useMutacionComunicado } from '@/features/comunicaciones/hooks/useMutacionComunicado';
import { useComunicadoDetalle } from '@/features/comunicaciones/hooks/useComunicadoDetalle';
import { useDecanatos } from '@/features/identidad/hooks/useDecanatos';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { ApiError } from '@/shared/api/axios';
import { colors, radius, spacing } from '@/shared/ui';
import {
  BotonCircular,
  Chip,
  ContenidoCentrado,
  TextField,
  ThemedButton,
  ThemedText,
  ThemedView,
  useEsDesktop,
} from '@/shared/ui';
import { etiquetaAudiencia } from '@/shared/lib/etiquetas';
import { CuerpoMarkdown } from '@/features/comunicaciones/components/CuerpoMarkdown';
import { EditorCuerpo } from '@/features/comunicaciones/components/EditorCuerpo';
import { EditorCuerpoEnriquecido } from '@/features/comunicaciones/components/EditorCuerpoEnriquecido';
import { PressableScale } from '@/shared/ui/PressableScale';
import { ArrowLeftIcon, ImagesSquareIcon } from 'phosphor-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { CLAVES_COMUNICADOS } from '@/features/comunicaciones/hooks/queryKeys';

export default function FormularioComunicadoScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const esEdicion = Boolean(id);
  const detalle = useComunicadoDetalle(id ?? 'nuevo');
  const decanatos = useDecanatos();
  const usuario = useSesionStore((s) => s.usuario);
  const insets = useSafeAreaInsets();

  const [titulo, setTitulo] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [seleccion, setSeleccion] = useState<number[] | null>(null);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  // Pestañas móvil: editor ↔ vista previa (en desktop ambas conviven).
  const [pestana, setPestana] = useState<'editar' | 'vista'>('editar');
  const esDesktop = useEsDesktop();
  // Portada: archivo local elegido (aún sin subir) o la API/servidor en edición.
  const [portadaLocal, setPortadaLocal] = useState<ArchivoAdjunto | null>(null);
  const [quitarPortadaActual, setQuitarPortadaActual] = useState(false);
  const queryClient = useQueryClient();
  const portadaApi = usePortada(
    id ?? 'nuevo',
    Boolean(esEdicion && detalle.data?.imagenPath && !quitarPortadaActual && !portadaLocal),
  );

  const crear = useMutacionComunicado(crearComunicado);
  const editar = useMutacionComunicado((patch: Partial<InputComunicado>) =>
    editarComunicado(id!, patch),
  );

  useEffect(() => {
    const comunicado = detalle.data;
    if (esEdicion && comunicado && titulo === '') {
      setTitulo(comunicado.titulo);
      setCuerpo(comunicado.cuerpo);
      setSeleccion(comunicado.decanatoIds);
    }
  }, [esEdicion, detalle.data, titulo]);

  const seleccionEfectiva = useMemo(() => {
    if (seleccion !== null) return seleccion;
    if (usuario?.rol === 'COMUNICADOR') {
      return usuario.decanato_id !== null ? [usuario.decanato_id] : [];
    }
    return null;
  }, [seleccion, usuario]);

  const errores = validarFormularioComunicado({ titulo, cuerpo });

  function toggleDecanato(idDecanato: number) {
    if (usuario?.rol !== 'ADMIN' || seleccion === null) return;
    setSeleccion(
      seleccion.includes(idDecanato)
        ? seleccion.filter((d) => d !== idDecanato)
        : [...seleccion, idDecanato],
    );
  }

  function toggleGlobal() {
    if (usuario?.rol !== 'ADMIN') return;
    setSeleccion(seleccion === null || seleccion.length > 0 ? [] : null);
  }

  async function elegirPortada(desdeCamara: boolean) {
    setErrorServidor(null);
    try {
      const archivo = await seleccionarPortada(desdeCamara);
      if (archivo) {
        setPortadaLocal(archivo);
        setQuitarPortadaActual(false);
      }
    } catch (e) {
      setErrorServidor(e instanceof Error ? e.message : 'No se pudo abrir el selector.');
    }
  }

  async function eliminarPortadaElegida() {
    if (portadaLocal) {
      setPortadaLocal(null);
      return;
    }
    if (esEdicion && detalle.data?.imagenPath) {
      setQuitarPortadaActual(true);
    }
  }

  const tienePortadaActual =
    Boolean(portadaLocal) ||
    Boolean(esEdicion && detalle.data?.imagenPath && !quitarPortadaActual);

  async function guardar() {
    setErrorServidor(null);
    const err = validarFormularioComunicado({ titulo, cuerpo });
    if (tieneErrores(err)) return;

    const audiencia = clampAudiencia(
      usuario!.rol,
      usuario!.decanato_id,
      seleccionEfectiva ?? [],
    );

    try {
      const guardado = esEdicion
        ? await editar.mutateAsync({
            titulo: titulo.trim(),
            cuerpo,
            decanatoIds: audiencia,
          })
        : await crear.mutateAsync({
            titulo: titulo.trim(),
            cuerpo,
            decanatoIds: audiencia,
          });

      // Portada opcional sobre el comunicado ya guardado: subir como
      // adjunto (flujo de 2 fases) y asignar; o quitar la que existía.
      if (portadaLocal && guardado?.id) {
        const adjunto = await subirAdjunto(guardado.id, portadaLocal);
        await asignarPortada(guardado.id, adjunto.id);
        setPortadaLocal(null);
      }
      if (quitarPortadaActual && guardado?.id) {
        await quitarPortada(guardado.id);
        setQuitarPortadaActual(false);
      }
      void queryClient.invalidateQueries({ queryKey: CLAVES_COMUNICADOS.portada(guardado?.id ?? '') });
      router.back();
    } catch (e) {
      if (e instanceof ApiError) {
        setErrorServidor(e.message);
      } else {
        setErrorServidor('Error de red. Verifica tu conexión.');
      }
    }
  }

  if (esEdicion && detalle.isPending) {
    return (
      <ThemedView variant="base" style={estilos.centro}>
        <ThemedText tone="secondary">Cargando comunicado...</ThemedText>
      </ThemedView>
    );
  }

  if (esEdicion && detalle.isError) {
    return (
      <ThemedView variant="base" style={estilos.centro}>
        <ThemedText tone="secondary">No se pudo cargar el comunicado a editar.</ThemedText>
      </ThemedView>
    );
  }

  const pendiente = crear.isPending || editar.isPending;
  const adminSinElegir = usuario?.rol === 'ADMIN' && seleccionEfectiva === null && !esEdicion;

  const etiquetaAudienciaPreview =
    seleccionEfectiva !== null ? etiquetaAudiencia(seleccionEfectiva) : 'Sin audiencia aún';

  const vistaPrevia = (
    <VistaPreviaComunicado
      titulo={titulo.trim()}
      cuerpo={cuerpo}
      uriPortada={portadaLocal?.uri ?? portadaApi.url ?? null}
      audiencia={etiquetaAudienciaPreview}
      autorNombre={usuario?.nombre ?? ''}
    />
  );

  const formulario = (
    <View style={estilos.forma}>
      <TextField
        label="Título"
        error={errores.titulo ?? undefined}
        value={titulo}
        onChangeText={setTitulo}
        maxLength={200}
        editable={!pendiente}
        placeholder="Ej. Suspensión de clases del viernes"
      />

      {Platform.OS === 'web' ? (
        // Web = segunda clase: editor plano con barra que escribe la
        // sintaxis (el editor enriquecido en web es experimental y va
        // detrás del nativo en la librería).
        <EditorCuerpo
          value={cuerpo}
          onChangeText={setCuerpo}
          error={errores.cuerpo ?? undefined}
          editable={!pendiente}
        />
      ) : (
        // Nativo: no controlado — monta una sola vez con el markdown
        // inicial (cuerpo cargado en edición; vacío en creación) y desde
        // ahí emite cambios por onChangeMarkdown.
        <EditorCuerpoEnriquecido
          key={id ?? 'nuevo'}
          valorInicial={esEdicion ? (detalle.data?.cuerpo ?? '') : ''}
          onChangeMarkdown={setCuerpo}
          error={errores.cuerpo ?? undefined}
          editable={!pendiente}
        />
      )}

      <Campo label="Portada (opcional)">
        {tienePortadaActual ? (
          <View style={estilos.wrapPortada}>
            {portadaLocal ? (
              <Image source={{ uri: portadaLocal.uri }} style={estilos.portada} resizeMode="cover" />
            ) : portadaApi.url ? (
              <Image source={{ uri: portadaApi.url }} style={estilos.portada} resizeMode="cover" />
            ) : null}
            <View style={estilos.filaPortada}>
              <ThemedButton
                title="Cambiar"
                variant="ghost"
                size="sm"
                onPress={() => void elegirPortada(false)}
              />
              {Platform.OS !== 'web' ? (
                <ThemedButton
                  title="Cámara"
                  variant="ghost"
                  size="sm"
                  onPress={() => void elegirPortada(true)}
                />
              ) : null}
              <ThemedButton
                title="Quitar"
                variant="ghost"
                size="sm"
                onPress={eliminarPortadaElegida}
              />
            </View>
          </View>
        ) : (
          <View style={estilos.bloquePortadaVacia}>
            <PressableScale
              onPress={() => void elegirPortada(false)}
              accessibilityRole="button"
              accessibilityLabel="Añadir portada desde la galería">
              <ThemedView variant="elevated" style={estilos.slotPortada}>
                <ImagesSquareIcon size={28} color={colors.brand.primary} />
                <ThemedText variant="bodySm" weight="semibold">
                  Añadir portada
                </ThemedText>
                <ThemedText variant="caption" style={estilos.slotAyuda}>
                  Galería o cámara · recorte 3:2
                </ThemedText>
              </ThemedView>
            </PressableScale>
            {Platform.OS !== 'web' ? (
              <View style={estilos.filaPortada}>
                <ThemedButton
                  title="Cámara"
                  variant="ghost"
                  size="sm"
                  onPress={() => void elegirPortada(true)}
                />
              </View>
            ) : null}
          </View>
        )}
      </Campo>

      <Campo
        label="Audiencia"
        error={
          usuario?.rol === 'COMUNICADOR' && !usuario.decanato_id
            ? 'Tu cuenta no tiene decanato asignado; no puedes crear comunicados.'
            : null
        }>
        {usuario?.rol === 'COMUNICADOR' ? (
          <ThemedText variant="body" tone="secondary">
            Se publicará únicamente en tu decanato.
          </ThemedText>
        ) : (
          <View style={estilos.audiencias}>
            <Pressable onPress={toggleGlobal}>
              <ThemedView
                variant={seleccionEfectiva?.length === 0 ? 'sunken' : 'elevated'}
                style={estilos.chip}>
                <ThemedText
                  variant="caption"
                  weight={seleccionEfectiva?.length === 0 ? 'semibold' : 'regular'}>
                  Toda la universidad
                </ThemedText>
              </ThemedView>
            </Pressable>
            {(decanatos.data ?? []).map((d) => (
              <Pressable key={d.id} onPress={() => toggleDecanato(d.id)}>
                <ThemedView
                  variant={seleccionEfectiva?.includes(d.id) ? 'sunken' : 'elevated'}
                  style={estilos.chip}>
                  <ThemedText
                    variant="caption"
                    weight={seleccionEfectiva?.includes(d.id) ? 'semibold' : 'regular'}>
                    {d.nombre}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            ))}
          </View>
        )}
      </Campo>

      {errorServidor ? (
        <ThemedText variant="caption" style={estilos.errorTexto}>
          {errorServidor}
        </ThemedText>
      ) : null}

      <ThemedButton
        title={esEdicion ? 'Guardar cambios' : 'Crear borrador'}
        onPress={guardar}
        loading={pendiente}
        disabled={pendiente || adminSinElegir}
      />
    </View>
  );

  // Desktop: formulario y preview lado a lado. Móvil: pestañas que
  // alternan el editor con la vista previa.
  const cuerpoPrincipal = (
    <>
      <View style={estilos.pestanas}>
        <Chip
          etiqueta="Editar"
          activa={pestana === 'editar'}
          onPress={() => setPestana('editar')}
          size="sm"
        />
        <Chip
          etiqueta="Vista previa"
          activa={pestana === 'vista'}
          onPress={() => setPestana('vista')}
          size="sm"
        />
      </View>
      {pestana === 'editar' ? formulario : vistaPrevia}
    </>
  );

  return (
    // View plano (no SafeAreaView): esta pantalla arranca bajo la
    // BarraInstitucional (inset superior ya consumido fuera del Stack);
    // SafeAreaView lo duplicaría como franja fija. El inferior se suma
    // al scroll para respetar el nav del sistema.
    <View style={estilos.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={estilos.flex}
        behavior="padding">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            estilos.scroll,
            { paddingBottom: spacing.four + Math.max(insets.bottom, spacing.four) },
          ]}>
          <ContenidoCentrado style={estilos.anchoEditor}>
            <View style={estilos.cabecera}>
              <BotonCircular label="Volver" onPress={() => router.back()}>
                <ArrowLeftIcon size={20} color={colors.brand.primary} weight="bold" />
              </BotonCircular>
              <ThemedText variant="title" weight="bold" style={estilos.tituloPantalla}>
                {esEdicion ? 'Editar comunicado' : 'Nuevo comunicado'}
              </ThemedText>
              <View style={estilos.espacioSimetrico} />
            </View>
            {esDesktop ? (
              <View style={estilos.filaEditor}>
                <View style={estilos.formaCol}>{formulario}</View>
                <View style={estilos.previewCol}>{vistaPrevia}</View>
              </View>
            ) : (
              cuerpoPrincipal
            )}
          </ContenidoCentrado>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Campo({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <ThemedView variant="base" style={estilos.campo}>
      <ThemedText variant="caption" tone="secondary">
        {label}
      </ThemedText>
      {children}
      {error ? (
        <ThemedText variant="caption" style={estilos.errorTexto}>
          {error}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

/**
 * Vista previa del comunicado: cómo lo verán los estudiantes en el detalle
 * (portada 3:2, titular, autor · audiencia, cuerpo Markdown). Reusa
 * CuerpoMarkdown para garantizar fiel reproducción del render real.
 */
function VistaPreviaComunicado({
  titulo,
  cuerpo,
  uriPortada,
  audiencia,
  autorNombre,
}: {
  titulo: string;
  cuerpo: string;
  uriPortada: string | null;
  audiencia: string;
  autorNombre: string;
}) {
  return (
    <ThemedView variant="card" style={estilos.preview}>
      <ThemedText variant="caption" tone="tertiary">
        Vista previa
      </ThemedText>
      {uriPortada ? (
        <Image
          source={{ uri: uriPortada }}
          style={estilos.portadaPreview}
          resizeMode="cover"
        />
      ) : null}
      <ThemedText variant="title" weight="bold">
        {titulo.length > 0 ? titulo : 'Comunicado sin título'}
      </ThemedText>
      <ThemedText variant="caption" tone="secondary">
        {autorNombre.length > 0 ? `${autorNombre} · ${audiencia}` : audiencia}
      </ThemedText>
      {cuerpo.trim().length > 0 ? (
        <CuerpoMarkdown cuerpo={cuerpo} />
      ) : (
        <ThemedText variant="body" tone="tertiary">
          El cuerpo aparecerá aquí cuando lo escribas.
        </ThemedText>
      )}
    </ThemedView>
  );
}

const estilos = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  flex: { flex: 1 },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.six,
  },
  scroll: {
    padding: spacing.four,
    gap: spacing.four,
  },
  campo: {
    gap: spacing.one,
  },
  bloquePortadaVacia: {
    gap: spacing.two,
  },
  audiencias: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.two,
    marginTop: spacing.one,
  },
  chip: {
    paddingHorizontal: spacing.three,
    paddingVertical: spacing.two,
    borderRadius: radius.pill,
  },
  errorTexto: {
    color: colors.status.danger,
  },
  filaPortada: {
    flexDirection: 'row',
    gap: spacing.two,
  },
  slotPortada: {
    minHeight: 44,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  slotAyuda: {
    color: colors.brand.primary,
  },
  wrapPortada: {
    gap: spacing.xs,
  },
  portada: {
    width: '100%',
    aspectRatio: 3 / 2,
    borderRadius: radius.md,
    backgroundColor: colors.brand.surfaceBlue,
  },
  error: {
    color: colors.status.danger,
    textAlign: 'center',
  },
  // El editor con preview lateral pide más ancho que el documento de
  // lectura: sobrecarga puntual del token maxContentWidth.
  anchoEditor: { maxWidth: 1040 },
  filaEditor: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xxl,
  },
  forma: { gap: spacing.four },
  formaCol: { flex: 1 },
  tituloPantalla: {
    flex: 1,
    textAlign: 'center',
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.four,
  },
  espacioSimetrico: {
    width: 40,
  },
  pestanas: {
    flexDirection: 'row',
    gap: spacing.two,
  },
  previewCol: { flex: 1 },
  preview: {
    width: '100%',
    gap: spacing.three,
  },
  portadaPreview: {
    width: '100%',
    aspectRatio: 3 / 2,
    borderRadius: radius.md,
    backgroundColor: colors.brand.surfaceBlue,
  },
});
