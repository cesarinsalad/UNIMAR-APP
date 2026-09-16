import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  crearEvento,
  editarEvento,
  type InputEvento,
} from '@/features/calendario/api/eventos.api';
import {
  ajustarDiaCompleto,
  audienciaParaEvento,
  finPredeterminado,
  PRESETS_RECORDATORIO,
  tieneErroresEvento,
  validarFormularioEvento,
} from '@/features/calendario/hooks/formulario-evento';
import { useMutacionEvento } from '@/features/calendario/hooks/useMutacionEvento';
import { useEventoDetalle } from '@/features/calendario/hooks/useEventoDetalle';
import { useDecanatos } from '@/features/identidad/hooks/useDecanatos';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { ApiError } from '@/shared/api/axios';
import { colors, radius, spacing } from '@/shared/ui';
import { ThemedButton, ThemedText, ThemedView } from '@/shared/ui';

export default function FormularioEventoScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const esEdicion = Boolean(id);
  const detalle = useEventoDetalle(id ?? 'nuevo');
  const decanatos = useDecanatos();
  const usuario = useSesionStore((s) => s.usuario);

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [conFin, setConFin] = useState(true);
  const [diaCompleto, setDiaCompleto] = useState(false);
  const [recordatorio, setRecordatorio] = useState<number | null>(null);
  const [seleccion, setSeleccion] = useState<number[] | null>(null);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  // Elección de tipo (UI): por defecto PERSONAL para todos; oficiales solo
  // COMUNICADOR/ADMIN; en edición se congela (contrato lo prohíbe cambiar).
  const [tipo, setTipo] = useState<'OFICIAL' | 'PERSONAL'>('PERSONAL');

  const [inicio, setInicio] = useState<Date>(() => nuevaFechaSana());
  const [fin, setFin] = useState<Date | null>(() => finPredeterminado(proxima()));
  function proxima(): Date {
    return nuevaFechaSana();
  }

  const crear = useMutacionEvento(crearEvento);
  const editar = useMutacionEvento((patch: Omit<Partial<InputEvento>, 'tipo'>) =>
    editarEvento(id!, patch),
  );

  useEffect(() => {
    const evento = detalle.data;
    if (esEdicion && evento && titulo === '') {
      setTitulo(evento.titulo);
      setDescripcion(evento.descripcion ?? '');
      setTipo(evento.tipo);
      setDiaCompleto(evento.diaCompleto);
      setInicio(new Date(evento.inicioAt));
      if (evento.finAt) {
        setFin(new Date(evento.finAt));
        setConFin(true);
      } else {
        setFin(null);
        setConFin(false);
      }
      setRecordatorio(evento.recordatorioMinutos);
      setSeleccion(evento.decanatoIds);
    }
  }, [esEdicion, detalle.data, titulo]);

  const puedeElegirTipo = usuario !== null && usuario.rol !== 'ESTUDIANTE' && !esEdicion;
  const errores = validarFormularioEvento({
    titulo,
    descripcion,
    inicio,
    fin: conFin ? fin : null,
  });

  function aplicarDiaCompleto(activo: boolean) {
    const { inicio: nuevoInicio, fin: nuevoFin } = ajustarDiaCompleto(inicio, fin, activo);
    setDiaCompleto(activo);
    setInicio(nuevoInicio);
    setFin(nuevoFin);
  }

  async function guardar() {
    setErrorServidor(null);
    const err = validarFormularioEvento({
      titulo,
      descripcion,
      inicio,
      fin: conFin ? fin : null,
    });
    if (tieneErroresEvento(err)) return;

    const audiencia = audienciaParaEvento(
      usuario!.rol,
      tipo,
      usuario!.decanato_id,
      seleccion,
    );

    const payload: InputEvento = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      tipo,
      inicioAt: inicio.toISOString(),
      finAt: conFin ? (fin ?? finPredeterminado(inicio)).toISOString() : null,
      diaCompleto,
      recordatorioMinutos: recordatorio,
      decanatoIds: audiencia,
    };

    try {
      if (esEdicion) {
        const { tipo: _intocable, ...soloEditable } = payload;
        if (conFin === false) {
          soloEditable.finAt = null;
        }
        await editar.mutateAsync(soloEditable);
      } else {
        await crear.mutateAsync(payload);
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
        <ThemedText tone="secondary">Cargando evento...</ThemedText>
      </ThemedView>
    );
  }

  if (esEdicion && detalle.isError) {
    return (
      <ThemedView variant="base" style={estilos.centro}>
        <ThemedText tone="secondary">No se pudo cargar el evento a editar.</ThemedText>
      </ThemedView>
    );
  }

  const pendiente = crear.isPending || editar.isPending;

  function seleccionEfectiva(): number[] | null {
    if (tipo !== 'OFICIAL') return null;
    if (usuario?.rol === 'COMUNICADOR') {
      return usuario.decanato_id !== null ? [usuario.decanato_id] : null;
    }
    return seleccion ?? [];
  }

  return (
    <SafeAreaView style={estilos.safe}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: esEdicion ? 'Editar evento' : 'Nuevo evento',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.text.onPrimary,
        }}
      />
      <KeyboardAvoidingView
        style={estilos.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={estilos.scroll}>
          {puedeElegirTipo ? (
            <View style={estilos.filaChips}>
              {(['PERSONAL', 'OFICIAL'] as const).map((t) => (
                <Pressable key={t} onPress={() => setTipo(t)}>
                  <ThemedView variant={tipo === t ? 'sunken' : 'elevated'} style={estilos.chip}>
                    <ThemedText variant="caption" weight={tipo === t ? 'semibold' : 'regular'}>
                      {t === 'PERSONAL' ? 'Personal (solo tú lo ves)' : 'Oficial (para una audiencia)'}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              ))}
            </View>
          ) : null}

          {esEdicion ? (
            <ThemedText variant="caption" tone="tertiary">
              Tipo: {tipo === 'OFICIAL' ? 'Evento oficial' : 'Personal'} (no editable)
            </ThemedText>
          ) : null}

          <Campo label={`Título — ${titulo.length}/200`} error={errores.titulo}>
            <TextInput
              value={titulo}
              onChangeText={setTitulo}
              maxLength={200}
              editable={!pendiente}
              style={estilos.input}
              placeholder="Ej. Examen de Bases de Datos II"
              placeholderTextColor={colors.text.tertiary}
            />
          </Campo>

          <Campo label={`Descripción — ${descripcion.length}/2000`} error={errores.descripcion}>
            <TextInput
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              maxLength={2000}
              textAlignVertical="top"
              editable={!pendiente}
              style={[estilos.input, estilos.textarea]}
              placeholder="Detalles del evento (opcional)"
              placeholderTextColor={colors.text.tertiary}
            />
          </Campo>

          <View style={estilos.filaSwitch}>
            <ThemedText variant="body">Todo el día</ThemedText>
            <Switch
              value={diaCompleto}
              onValueChange={aplicarDiaCompleto}
              disabled={pendiente}
              trackColor={{ true: colors.primary as string, false: colors.border.subtle }}
            />
          </View>

          {diaCompleto ? (
            <ThemedText variant="caption" tone="secondary">
              {inicio.toLocaleDateString('es-VE', { dateStyle: 'long' })} — todos el día
            </ThemedText>
          ) : (
            <>
              <BloqueFecha
                clave="inicio"
                etiqueta="Inicio"
                fecha={inicio}
                conHora
                onChange={(d) => {
                  setInicio(d);
                  if (conFin) setFin(finPredeterminado(d));
                }}
              />
              {conFin ? (
                <BloqueFecha
                  clave="fin"
                  etiqueta="Fin"
                  fecha={fin ?? finPredeterminado(inicio)}
                  conHora
                  onChange={(d) => setFin(d)}
                />
              ) : null}
              <Pressable onPress={() => setConFin((v) => !v)}>
                <ThemedText variant="caption" weight="semibold" style={estilos.accionTextual}>
                  {conFin ? 'Quitar hora de fin' : 'Añadir hora de fin'}
                </ThemedText>
              </Pressable>
            </>
          )}

          <Campo label="Recordatorio">
            <View style={estilos.filaChips}>
              {PRESETS_RECORDATORIO.map((preset) => (
                <Pressable key={preset.etiqueta} onPress={() => setRecordatorio(preset.minutos)}>
                  <ThemedView
                    variant={recordatorio === preset.minutos ? 'sunken' : 'elevated'}
                    style={estilos.chip}>
                    <ThemedText
                      variant="caption"
                      weight={recordatorio === preset.minutos ? 'semibold' : 'regular'}>
                      {preset.etiqueta}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              ))}
            </View>
          </Campo>

          {tipo === 'OFICIAL' ? (
            <Campo
              label="Audiencia"
              error={
                usuario?.rol === 'COMUNICADOR' && !usuario.decanato_id
                  ? 'Tu cuenta no tiene decanato; no puedes crear eventos oficiales.'
                  : null
              }>
              <View style={estilos.filaChips}>
                <Pressable onPress={() => setSeleccion([])}>
                  <ThemedView
                    variant={seleccionEfectiva()?.length === 0 ? 'sunken' : 'elevated'}
                    style={estilos.chip}>
                    <ThemedText
                      variant="caption"
                      weight={seleccionEfectiva()?.length === 0 ? 'semibold' : 'regular'}>
                      Toda la universidad
                    </ThemedText>
                  </ThemedView>
                </Pressable>
                {(decanatos.data ?? []).map((d) => (
                  <Pressable
                    key={d.id}
                    onPress={() => {
                      if (usuario?.rol !== 'ADMIN') return;
                      const actual = seleccionEfectiva();
                      if (actual === null) return;
                      setSeleccion(
                        actual.includes(d.id)
                          ? actual.filter((x) => x !== d.id)
                          : [...actual, d.id],
                      );
                    }}>
                    <ThemedView
                      variant={seleccionEfectiva()?.includes(d.id) ? 'sunken' : 'elevated'}
                      style={estilos.chip}>
                      <ThemedText
                        variant="caption"
                        weight={seleccionEfectiva()?.includes(d.id) ? 'semibold' : 'regular'}>
                        {d.nombre}
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                ))}
              </View>
            </Campo>
          ) : null}

          {errorServidor ? (
            <ThemedText variant="caption" style={estilos.errorTexto}>
              {errorServidor}
            </ThemedText>
          ) : null}

          <ThemedButton
            title={esEdicion ? 'Guardar cambios' : 'Crear evento'}
            onPress={guardar}
            loading={pendiente}
            disabled={pendiente}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Par de fecha/hora nativo (decisión 4b: pickers del sistema). */
function BloqueFecha({
  clave,
  etiqueta,
  fecha,
  conHora,
  onChange,
}: {
  clave: string;
  etiqueta: string;
  fecha: Date;
  conHora: boolean;
  onChange: (d: Date) => void;
}) {
  const [verFecha, setVerFecha] = useState(false);
  const [verHora, setVerHora] = useState(false);
  const esIos = Platform.OS === 'ios';

  return (
    <View style={estilos.campo}>
      <ThemedText variant="caption" tone="secondary">
        {etiqueta}
      </ThemedText>
      <View style={estilos.filaFechas}>
        <Pressable onPress={() => setVerFecha(true)}>
          <ThemedView variant="elevated" style={estilos.chip}>
            <ThemedText variant="body">
              {fecha.toLocaleDateString('es-VE', { dateStyle: 'medium' })}
            </ThemedText>
          </ThemedView>
        </Pressable>
        {conHora ? (
          <Pressable onPress={() => setVerHora(true)}>
            <ThemedView variant="elevated" style={estilos.chip}>
              <ThemedText variant="body">
                {fecha.toLocaleTimeString('es-VE', { timeStyle: 'short' })}
              </ThemedText>
            </ThemedView>
          </Pressable>
        ) : null}
      </View>

      {verFecha ? (
        <DateTimePicker
          value={fecha}
          mode="date"
          display={esIos ? 'spinner' : 'default'}
          onChange={(e, nueva) => {
            if (!esIos) setVerFecha(false);
            if (nueva) {
              // conservar hora actual del estado
              const conservada = new Date(fecha);
              conservada.setFullYear(nueva.getFullYear());
              conservada.setMonth(nueva.getMonth());
              conservada.setDate(nueva.getDate());
              onChange(conservada);
            }
          }}
          testID={`fecha-${clave}`}
        />
      ) : null}
      {verHora && conHora ? (
        <DateTimePicker
          value={fecha}
          mode="time"
          display={esIos ? 'spinner' : 'default'}
          onChange={(e, nueva) => {
            if (!esIos) setVerHora(false);
            if (nueva) {
              const conservada = new Date(fecha);
              conservada.setHours(nueva.getHours());
              conservada.setMinutes(nueva.getMinutes());
              onChange(conservada);
            }
          }}
          testID={`hora-${clave}`}
        />
      ) : null}
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

/** Nada sensible por defecto: "hoy + 1h" al minuto en punto. */
function nuevaFechaSana(): Date {
  const ahora = new Date();
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), ahora.getHours() + 1, 0, 0, 0);
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
    minHeight: 100,
  },
  filaChips: {
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
  filaFechas: {
    flexDirection: 'row',
    gap: spacing.two,
    marginTop: spacing.one,
  },
  filaSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: spacing.two,
  },
  accionTextual: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  errorTexto: {
    color: colors.status.danger,
  },
});