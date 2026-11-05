import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  crearEvento,
  editarEvento,
  type InputEvento,
} from '@/features/calendario/api/eventos.api';
import {
  ajustarDiaCompleto,
  audienciaParaEvento,
  finPredeterminado,
  nuevaFechaSana,
  PRESETS_RECORDATORIO,
  tieneErroresEvento,
  validarFormularioEvento,
} from '@/features/calendario/hooks/formulario-evento';
import { SelectorFecha } from '@/features/calendario/components/SelectorFecha';
import { SelectorHora } from '@/features/calendario/components/SelectorHora';
import { useMutacionEvento } from '@/features/calendario/hooks/useMutacionEvento';
import { useEventoDetalle } from '@/features/calendario/hooks/useEventoDetalle';
import { useDecanatos } from '@/features/identidad/hooks/useDecanatos';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { ApiError } from '@/shared/api/axios';
import { colors, spacing } from '@/shared/ui';
import {
  Chip,
  Select,
  TextField,
  ThemedButton,
  ThemedText,
  ThemedView,
  useEsDesktop,
} from '@/shared/ui';
import type { TipoEvento } from '@/features/calendario/types';
import { tiposConsola } from '@/features/calendario/hooks/tipos-consola';

const ETIQUETA_TIPO: Record<TipoEvento, string> = {
  PERSONAL: 'Personal',
  OFICIAL: 'Oficial',
  INSTITUCIONAL: 'Institucional',
  FERIADO: 'Feriado',
};

const PISTA_TIPO: Record<TipoEvento, string> = {
  PERSONAL: '',
  OFICIAL: 'Para una audiencia: toda la universidad o decanatos específicos.',
  INSTITUCIONAL: 'Fecha fija del campus; visible para todos, sin audiencia.',
  FERIADO: 'Día no laborable; visible para todos.',
};

/**
 * Formulario de eventos PROPIO de la consola (crear y editar, inline: la
 * sidebar/nav permanece). Diferencias con /eventos/nuevo (el form móvil del
 * tab calendario): sin PERSONAL — los personales se gestionan en la app, la
 * consola crea oficiales/institucionales/feriados con default OFICIAL — y
 * chrome de consola (título + acciones a la derecha, campos en grid de dos
 * columnas en desktop) en vez de pantalla full-screen móvil. La lógica
 * (validación, audiencia, presets, mutación) es la misma del feature.
 */
export function FormularioEvento({
  eventoId,
  onCerrar,
}: {
  /** null = creación; string = edición (precarga del detalle). */
  eventoId: string | null;
  onCerrar: () => void;
}) {
  const esEdicion = eventoId !== null;
  const esDesktop = useEsDesktop();
  const usuario = useSesionStore((s) => s.usuario);
  const insets = useSafeAreaInsets();
  const detalle = useEventoDetalle(eventoId ?? '', { activada: esEdicion });
  const decanatos = useDecanatos();

  const tipos = tiposConsola(usuario?.rol);

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [lugar, setLugar] = useState('');
  const [conFin, setConFin] = useState(true);
  const [diaCompleto, setDiaCompleto] = useState(false);
  const [recordatorio, setRecordatorio] = useState<number | null>(null);
  const [seleccion, setSeleccion] = useState<number[] | null>(null);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  // Default OFICIAL (primero de tiposConsola); en edición se congela (el
  // contrato no permite cambiar el tipo).
  const [tipo, setTipo] = useState<TipoEvento>(() => tipos[0] ?? 'OFICIAL');

  const [inicio, setInicio] = useState<Date>(() => nuevaFechaSana());
  const [fin, setFin] = useState<Date | null>(() => finPredeterminado(nuevaFechaSana()));

  const crear = useMutacionEvento(crearEvento);
  const editar = useMutacionEvento((patch: Omit<Partial<InputEvento>, 'tipo'>) =>
    editarEvento(eventoId!, patch),
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

  function seleccionEfectiva(): number[] | null {
    if (tipo !== 'OFICIAL') return null;
    if (usuario?.rol === 'COMUNICADOR') {
      return usuario.decanato_id !== null ? [usuario.decanato_id] : null;
    }
    return seleccion ?? [];
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
      onCerrar();
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
        <ThemedButton title="Volver" variant="secondary" size="sm" onPress={onCerrar} />
      </ThemedView>
    );
  }

  const pendiente = crear.isPending || editar.isPending;

  return (
    <ThemedView variant="base" style={estilos.pane}>
      <ScrollView
        contentContainerStyle={[
          estilos.scroll,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Chrome de consola: título a la izquierda, acciones a la derecha. */}
        <View style={estilos.cabecera}>
          <ThemedText variant="subtitle" weight="semibold" numberOfLines={1}>
            {esEdicion ? 'Editar evento' : 'Nuevo evento'}
          </ThemedText>
          <View style={estilos.acciones}>
            <ThemedButton
              title="Cancelar"
              variant="ghost"
              size="sm"
              disabled={pendiente}
              onPress={onCerrar}
            />
            <ThemedButton
              title="Guardar evento"
              variant="primary"
              size="sm"
              loading={pendiente}
              disabled={pendiente}
              onPress={guardar}
            />
          </View>
        </View>

        {tipos.length > 1 ? (
          <View style={estilos.filaChips}>
            {tipos.map((t) => (
              <Chip
                key={t}
                etiqueta={ETIQUETA_TIPO[t]}
                activa={tipo === t}
                onPress={() => setTipo(t)}
                size="sm"
              />
            ))}
          </View>
        ) : null}
        <ThemedText variant="caption" tone="secondary">
          {esEdicion
            ? `Tipo: ${ETIQUETA_TIPO[tipo]} (no editable)`
            : `Tipo: ${ETIQUETA_TIPO[tipo]}. ${PISTA_TIPO[tipo]}`}
        </ThemedText>

        <Fila esDesktop={esDesktop}>
          <View style={estilos.celda}>
            <TextField
              label="Título"
              value={titulo}
              onChangeText={setTitulo}
              maxLength={200}
              editable={!pendiente}
              placeholder="Ej. Jornada de inscripción"
              error={errores.titulo ?? undefined}
            />
          </View>
        </Fila>

        <Fila esDesktop={esDesktop}>
          <View style={estilos.celda}>
            <SelectorFecha
              etiqueta="Fecha"
              fecha={inicio}
              onChange={(d) => {
                setInicio(d);
                if (conFin) setFin(finPredeterminado(d));
              }}
            />
          </View>
          <View style={estilos.celda}>
            <TextField
              label="Ubicación"
              value={lugar}
              onChangeText={setLugar}
              maxLength={120}
              editable={!pendiente}
              placeholder="Ej. Auditorio"
              error={errores.lugar ?? undefined}
            />
          </View>
        </Fila>

        <Fila esDesktop={esDesktop}>
          <View style={estilos.celda}>
            <ThemedText variant="bodySm" tone="primary">
              Hora
            </ThemedText>
            <View style={estilos.filaHoras}>
              <SelectorHora
                etiqueta="Empieza"
                valor={inicio}
                disabled={pendiente || diaCompleto}
                idPrueba="hora-inicio"
                onChange={(d) => setInicio(d)}
              />
              {conFin ? (
                <SelectorHora
                  etiqueta="Termina"
                  valor={fin ?? finPredeterminado(inicio)}
                  disabled={pendiente || diaCompleto}
                  idPrueba="hora-fin"
                  onChange={(d) => setFin(d)}
                />
              ) : null}
            </View>
            {errores.rango ? (
              <ThemedText variant="caption" style={estilos.errorTexto}>
                {errores.rango}
              </ThemedText>
            ) : null}
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
              <PressableText
                onPress={() => setConFin((v) => !v)}>
                {conFin ? 'Quitar hora de fin' : 'Añadir hora de fin'}
              </PressableText>
            )}
          </View>
          <View style={estilos.celda}>
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
          </View>
        </Fila>

        <Fila esDesktop={esDesktop}>
          <View style={estilos.celda}>
            <ThemedText variant="bodySm" tone="primary">
              Alerta
            </ThemedText>
            <Select<number | null>
              valor={recordatorio}
              opciones={PRESETS_RECORDATORIO.map((p) => ({
                valor: p.minutos,
                etiqueta: p.minutos === null ? 'Sin alerta' : p.etiqueta,
              }))}
              onChange={setRecordatorio}
              placeholder="Sin alerta"
            />
          </View>
        </Fila>

        {tipo === 'OFICIAL' ? (
          <View style={estilos.campo}>
            <ThemedText variant="bodySm" tone="primary">
              Audiencia
            </ThemedText>
            {usuario?.rol === 'COMUNICADOR' && !usuario.decanato_id ? (
              <ThemedText variant="caption" style={estilos.errorTexto}>
                Tu cuenta no tiene decanato; no puedes crear eventos oficiales.
              </ThemedText>
            ) : null}
            <View style={estilos.filaChips}>
              <Chip
                etiqueta="Toda la universidad"
                activa={seleccionEfectiva()?.length === 0}
                onPress={() => {
                  if (usuario?.rol !== 'ADMIN') return;
                  setSeleccion([]);
                }}
                size="sm"
              />
              {(decanatos.data ?? []).map((d) => (
                <Chip
                  key={d.id}
                  etiqueta={d.nombre}
                  activa={seleccionEfectiva()?.includes(d.id) ?? false}
                  onPress={() => {
                    if (usuario?.rol !== 'ADMIN') return;
                    const actual = seleccionEfectiva();
                    if (actual === null) return;
                    setSeleccion(
                      actual.includes(d.id)
                        ? actual.filter((x) => x !== d.id)
                        : [...actual, d.id],
                    );
                  }}
                  size="sm"
                />
              ))}
            </View>
          </View>
        ) : null}

        {errorServidor ? (
          <ThemedText variant="caption" style={estilos.errorTexto}>
            {errorServidor}
          </ThemedText>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

/** Fila del grid: dos columnas en desktop, apilada en móvil de la consola. */
function Fila({ esDesktop, children }: { esDesktop: boolean; children: React.ReactNode }) {
  return (
    <View style={[estilos.fila, esDesktop ? estilos.filaDesktop : estilos.filaMovil]}>
      {children}
    </View>
  );
}

/** Acción textual subrayada (añadir/quitar hora de fin). */
function PressableText({ onPress, children }: { onPress: () => void; children: string }) {
  return (
    <Pressable onPress={onPress}>
      <ThemedText variant="caption" weight="semibold" style={estilos.accionTextual}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pane: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  scroll: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  acciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fila: {
    gap: spacing.md,
  },
  filaDesktop: {
    flexDirection: 'row',
  },
  filaMovil: {
    flexDirection: 'column',
  },
  celda: {
    flex: 1,
  },
  campo: {
    gap: spacing.xs,
  },
  filaHoras: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  filaTodoDia: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  filaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
