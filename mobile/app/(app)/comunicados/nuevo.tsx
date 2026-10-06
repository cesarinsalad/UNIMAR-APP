import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

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
import { ThemedButton, ThemedText, ThemedView } from '@/shared/ui';
import { useQueryClient } from '@tanstack/react-query';
import { CLAVES_COMUNICADOS } from '@/features/comunicaciones/hooks/queryKeys';

export default function FormularioComunicadoScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const esEdicion = Boolean(id);
  const detalle = useComunicadoDetalle(id ?? 'nuevo');
  const decanatos = useDecanatos();
  const usuario = useSesionStore((s) => s.usuario);

  const [titulo, setTitulo] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [seleccion, setSeleccion] = useState<number[] | null>(null);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
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

  return (
    <SafeAreaView style={estilos.safe}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: esEdicion ? 'Editar comunicado' : 'Nuevo comunicado',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.text.onPrimary,
        }}
      />
      <KeyboardAvoidingView
        style={estilos.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={estilos.scroll}>
          <Campo label="Título" error={errores.titulo}>
            <TextInput
              value={titulo}
              onChangeText={setTitulo}
              maxLength={200}
              editable={!pendiente}
              style={estilos.input}
              placeholder="Ej. Suspensión de clases del viernes"
              placeholderTextColor={colors.text.tertiary}
            />
          </Campo>

          <Campo label={`Cuerpo (Markdown) — ${cuerpo.length}/5000`} error={errores.cuerpo}>
            <TextInput
              value={cuerpo}
              onChangeText={setCuerpo}
              multiline
              maxLength={5000}
              textAlignVertical="top"
              editable={!pendiente}
              style={[estilos.input, estilos.textarea]}
              placeholder="Escribe el comunicado. Puede usar **negritas**, listas y enlaces."
              placeholderTextColor={colors.text.tertiary}
            />
          </Campo>

          <Campo label="Portada (opcional)">
            {tienePortadaActual ? (
              <View style={estilos.wrapPortada}>
                {portadaLocal ? (
                  <Image source={{ uri: portadaLocal.uri }} style={estilos.portada} resizeMode="cover" />
                ) : portadaApi.url ? (
                  <Image source={{ uri: portadaApi.url }} style={estilos.portada} resizeMode="cover" />
                ) : null}
                <ThemedButton
                  title="Quitar portada"
                  variant="ghost"
                  size="sm"
                  onPress={eliminarPortadaElegida}
                />
              </View>
            ) : (
              <View style={estilos.filaPortada}>
                <ThemedButton
                  title="Galería"
                  variant="secondary"
                  size="sm"
                  onPress={() => void elegirPortada(false)}
                />
                <ThemedButton
                  title="Cámara"
                  variant="secondary"
                  size="sm"
                  onPress={() => void elegirPortada(true)}
                />
              </View>
            )}
            <ThemedText variant="caption" tone="secondary">
              Recorte 3:2. Se sube al guardar.
            </ThemedText>
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
                Este comunicado irá únicamente a tu decanato (regla anti-global del sistema).
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  input: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.three,
    paddingVertical: spacing.three,
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: colors.background.base,
  },
  textarea: {
    minHeight: 180,
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
});
