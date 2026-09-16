import { useEffect, useMemo, useState } from 'react';
import {
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
  crearComunicado,
  editarComunicado,
  type InputComunicado,
} from '@/features/comunicaciones/api/comunicados.api';
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
      if (esEdicion) {
        await editar.mutateAsync({
          titulo: titulo.trim(),
          cuerpo,
          decanatoIds: audiencia,
        });
      } else {
        await crear.mutateAsync({
          titulo: titulo.trim(),
          cuerpo,
          decanatoIds: audiencia,
        });
      }
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
  error: {
    color: colors.status.danger,
    textAlign: 'center',
  },
});
