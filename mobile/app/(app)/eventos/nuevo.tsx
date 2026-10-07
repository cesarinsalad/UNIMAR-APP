import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeftIcon, CalendarBlankIcon, ClockIcon } from 'phosphor-react-native';

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
import {
  BotonCircular,
  Select,
  TextField,
  ThemedButton,
  ThemedText,
  ThemedView,
} from '@/shared/ui';

/** Formulario crear/editar evento (estilo mock): back circular + campos en
 *  cajas blancas con pickers nativos. El mismo screen sirve de editor via
 *  `?id=`; en edición el tipo se congela (el contrato no deja cambiarlo). */
export default function FormularioEventoScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const esEdicion = Boolean(id);
  const detalle = useEventoDetalle(id ?? 'nuevo');
  const decanatos = useDecanatos();
  const usuario = useSesionStore((s) => s.usuario);

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [lugar, setLugar] = useState('');
  const [conFin, setConFin] = useState(true);
  const [diaCompleto, setDiaCompleto] = useState(false);
  const [recordatorio, setRecordatorio] = useState<number | null>(null);
  const [seleccion, setSeleccion] = useState<number[] | null>(null);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  // Elección de tipo (UI): por defecto PERSONAL para todos; oficiales solo
  // COMUNICADOR/ADMIN; en edición se congela (contrato lo prohíbe cambiar).
  const [tipo, setTipo] = useState<'OFICIAL' | 'PERSONAL'>('PERSONAL');

  const [inicio, setInicio] = useState<Date>(() => nuevaFechaSana());
  const [fin, setFin] = useState<Date | null>(() => finPredeterminado(nuevaFechaSana()));

  const crear = useMutacionEvento(crearEvento);
  const editar = useMutacionEvento((patch: Omit<Partial<InputEvento>, 'tipo'>) =>
    editarEvento(id!, patch),
  );

  useEffect(() => {
    const evento = detalle.data;
    if (esEdicion && evento && titulo === '') {
      setTitulo(evento.titulo);
      setDescripcion(evento.descripcion ?? '');
      setLugar(evento.lugar ?? '');
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
    lugar: lugar.length > 0 ? lugar : null,
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
      lugar: lugar.length > 0 ? lugar : null,
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
      lugar: lugar.trim().length > 0 ? lugar.trim() : null,
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
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={estilos.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={estilos.scroll} showsVerticalScrollIndicator={false}>
          <View style={estilos.cabecera}>
            <BotonCircular label="Volver" onPress={() => router.back()}>
              <ArrowLeftIcon size={20} color={colors.brand.primary} weight="bold" />
            </BotonCircular>
            <ThemedText variant="subtitle" weight="semibold" style={estilos.tituloFecha}>
              {tituloFecha(inicio)}
            </ThemedText>
            <View style={estilos.espacioSimetrico} />
          </View>

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

          <TextField
            label="Título"
            value={titulo}
            onChangeText={setTitulo}
            maxLength={200}
            editable={!pendiente}
            placeholder="Ej. Examen Circuitos Eléctricos"
            error={errores.titulo ?? undefined}
          />

          <BloqueFecha
            etiqueta="Fecha"
            fecha={inicio}
            onChange={(d) => {
              setInicio(d);
              if (conFin) setFin(finPredeterminado(d));
            }}
          />

          <ThemedText variant="bodySm" tone="primary">
            Hora
          </ThemedText>
          <View style={estilos.filaHoras}>
            <ColumnaHora
              etiqueta="Empieza"
              valor={inicio}
              disabled={pendiente || diaCompleto}
              idPrueba="hora-inicio"
              onChange={(d) => setInicio(d)}
            />
            {conFin ? (
              <ColumnaHora
                etiqueta="Termina"
                valor={fin ?? finPredeterminado(inicio)}
                disabled={pendiente || diaCompleto}
                idPrueba="hora-fin"
                onChange={(d) => setFin(d)}
              />
            ) : null}
          </View>
          <View style={estilos.filaTodoDia}>
            <ThemedText variant="bodySm" tone="secondary">
              ¿Todo el día?
            </ThemedText>
            <Switch
              value={diaCompleto}
              onValueChange={aplicarDiaCompleto}
              disabled={pendiente}
              trackColor={{ true: colors.brand.primary as string, false: colors.border.subtle }}
            />
          </View>
          {diaCompleto ? null : (
            <Pressable onPress={() => setConFin((v) => !v)}>
              <ThemedText variant="caption" weight="semibold" style={estilos.accionTextual}>
                {conFin ? 'Quitar hora de fin' : 'Añadir hora de fin'}
              </ThemedText>
            </Pressable>
          )}

          <TextField
            label="Ubicación"
            value={lugar}
            onChangeText={setLugar}
            maxLength={120}
            editable={!pendiente}
            placeholder="Ej. Aula 16"
            error={errores.lugar ?? undefined}
          />

          <TextField
            label="Descripción"
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            maxLength={2000}
            textAlignVertical="top"
            editable={!pendiente}
            placeholder="Detalles del evento (opcional)"
            style={estilos.textarea}
            error={errores.descripcion ?? undefined}
          />

          <Campo label="Alerta">
            <Select<number | null>
              valor={recordatorio}
              opciones={PRESETS_RECORDATORIO.map((p) => ({
                valor: p.minutos,
                etiqueta: p.minutos === null ? 'Sin alerta' : p.etiqueta,
              }))}
              onChange={setRecordatorio}
              placeholder="Sin alerta"
            />
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
            title={esEdicion ? 'Guardar Evento' : 'Guardar Evento'}
            onPress={guardar}
            loading={pendiente}
            disabled={pendiente}
            variant="primary"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** "Jueves, 15 de octubre" (sin año, estilo mock) con mayúscula inicial. */
function tituloFecha(fecha: Date): string {
  const texto = fecha.toLocaleDateString('es-VE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Campo de fecha único con picker nativo. */
function BloqueFecha({
  etiqueta,
  fecha,
  onChange,
}: {
  etiqueta: string;
  fecha: Date;
  onChange: (d: Date) => void;
}) {
  const [verFecha, setVerFecha] = useState(false);
  const esIos = Platform.OS === 'ios';

  return (
    <View style={estilos.campo}>
      <ThemedText variant="bodySm" tone="primary">
        {etiqueta}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={etiqueta}
        onPress={() => setVerFecha(true)}
        style={({ pressed }) => [estilos.cajaHora, pressed && { opacity: 0.85 }]}>
        <CalendarBlankIcon size={18} color={colors.text.secondary} />
        <ThemedText variant="body">
          {fecha.toLocaleDateString('es-VE', { dateStyle: 'medium' })}
        </ThemedText>
      </Pressable>
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
          testID="fecha-inicio"
        />
      ) : null}
    </View>
  );
}

/** Columna de hora con caja blanca + picker nativo. */
function ColumnaHora({
  etiqueta,
  valor,
  disabled,
  idPrueba,
  onChange,
}: {
  etiqueta: string;
  valor: Date;
  disabled: boolean;
  idPrueba: string;
  onChange: (d: Date) => void;
}) {
  const [verHora, setVerHora] = useState(false);
  const esIos = Platform.OS === 'ios';

  return (
    <View style={estilos.columnaHora}>
      <ThemedText variant="bodySm" tone="secondary">
        {etiqueta}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={etiqueta}
        disabled={disabled}
        onPress={() => setVerHora(true)}
        style={({ pressed }) => [estilos.cajaHora, pressed && { opacity: 0.85 }]}>
        <ClockIcon size={18} color={colors.text.secondary} />
        <ThemedText variant="body">
          {valor.toLocaleTimeString('es-VE', { timeStyle: 'short' })}
        </ThemedText>
      </Pressable>
      {verHora ? (
        <DateTimePicker
          value={valor}
          mode="time"
          display={esIos ? 'spinner' : 'default'}
          onChange={(e, nueva) => {
            if (!esIos) setVerHora(false);
            if (nueva) {
              const conservada = new Date(valor);
              conservada.setHours(nueva.getHours());
              conservada.setMinutes(nueva.getMinutes());
              onChange(conservada);
            }
          }}
          testID={idPrueba}
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
    <View style={estilos.campo}>
      <ThemedText variant="bodySm" tone="primary">
        {label}
      </ThemedText>
      {children}
      {error ? (
        <ThemedText variant="caption" style={estilos.errorTexto}>
          {error}
        </ThemedText>
      ) : null}
    </View>
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
    backgroundColor: colors.bg.canvas,
  },
  flex: { flex: 1 },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  scroll: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  tituloFecha: {
    flex: 1,
    textAlign: 'center',
  },
  espacioSimetrico: {
    width: 40,
  },
  campo: {
    gap: spacing.xs,
  },
  filaHoras: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  columnaHora: {
    flex: 1,
    gap: spacing.xs,
  },
  cajaHora: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  filaTodoDia: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  textarea: {
    minHeight: 110,
  },
  accionTextual: {
    color: colors.brand.primary,
    textDecorationLine: 'underline',
  },
  errorTexto: {
    color: colors.status.danger,
  },
});
