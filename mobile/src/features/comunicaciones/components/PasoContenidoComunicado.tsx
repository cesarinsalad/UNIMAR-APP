import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from 'react-native';

import { colors, fontFamily, spacing, typography } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/ThemedText';

import { BarraHerramientasEditor } from './BarraHerramientasEditor';
import { HojaEnlaceComunicado } from './HojaEnlaceComunicado';
import type { ComandoEditor } from './comandosEditor';
import {
  aplicarComandoMarkdown,
  aplicarEnlaceMarkdown,
} from './editorMarkdown.acciones';
import type { SeleccionEditor } from './editorCuerpo.acciones';
import type { PasoContenidoComunicadoProps } from './PasoContenidoComunicado.types';

/**
 * Variante web (segunda clase deliberada): el motor enriquecido es nativo,
 * así que la web mantiene un editor Markdown con la misma barra e historial.
 */
export function PasoContenidoComunicado({
  titulo,
  errorTitulo,
  errorCuerpo,
  sesion,
  onCambiarTitulo,
  editable,
  limite = 5000,
}: PasoContenidoComunicadoProps) {
  const [seleccionForzada, setSeleccionForzada] =
    useState<SeleccionEditor | null>(null);
  const [hojaEnlace, setHojaEnlace] = useState(false);
  const [seleccionEnlace, setSeleccionEnlace] =
    useState<SeleccionEditor>({ start: 0, end: 0 });
  const seleccionRef = useRef<SeleccionEditor>({ start: 0, end: 0 });

  useEffect(() => {
    if (!seleccionForzada) return;
    const frame = requestAnimationFrame(() => setSeleccionForzada(null));
    return () => cancelAnimationFrame(frame);
  }, [seleccionForzada]);

  function cambiarSeleccion(
    e: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) {
    seleccionRef.current = e.nativeEvent.selection;
  }

  function registrar(markdown: string, siguiente: SeleccionEditor) {
    sesion.registrar(markdown, siguiente, 'formato');
    setSeleccionForzada(siguiente);
  }

  function ejecutarComando(comando: ComandoEditor) {
    if (!editable || comando === 'alternarMarkdown') return;
    if (comando === 'enlace') {
      Keyboard.dismiss();
      setSeleccionEnlace({ ...seleccionRef.current });
      setHojaEnlace(true);
      return;
    }
    const resultado = aplicarComandoMarkdown(
      sesion.valor,
      seleccionRef.current,
      comando,
    );
    registrar(resultado.texto, { start: resultado.inicio, end: resultado.fin });
  }

  function deshacer() {
    const destino = sesion.deshacer();
    if (destino) setSeleccionForzada(destino);
  }

  function rehacer() {
    const destino = sesion.rehacer();
    if (destino) setSeleccionForzada(destino);
  }

  const excede = sesion.valor.length > limite;

  return (
    <View style={estilos.contenedor}>
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={estilos.contenido}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <TextInput
          accessibilityLabel="Título del comunicado"
          accessibilityHint={errorTitulo}
          value={titulo}
          onChangeText={onCambiarTitulo}
          placeholder="Título del comunicado"
          placeholderTextColor={colors.text.secondary}
          editable={editable}
          multiline
          maxLength={200}
          style={estilos.titulo}
        />
        {errorTitulo ? (
          <ThemedText variant="caption" style={estilos.error}>
            {errorTitulo}
          </ThemedText>
        ) : null}

        <ThemedText variant="caption" tone="secondary" style={estilos.etiqueta}>
          Markdown
        </ThemedText>
        <TextInput
          accessibilityLabel="Cuerpo del comunicado en Markdown"
          accessibilityHint={errorCuerpo}
          value={sesion.valor}
          onChangeText={(markdown) =>
            sesion.registrar(markdown, seleccionRef.current, 'texto')
          }
          onSelectionChange={cambiarSeleccion}
          selection={seleccionForzada ?? undefined}
          editable={editable}
          multiline
          autoCapitalize="sentences"
          autoCorrect={false}
          placeholder="Empieza a escribir…"
          placeholderTextColor={colors.text.secondary}
          style={estilos.markdown}
        />

        <View style={estilos.pieDocumento}>
          {errorCuerpo ? (
            <ThemedText variant="caption" style={estilos.error}>
              {errorCuerpo}
            </ThemedText>
          ) : null}
          <ThemedText
            variant="caption"
            tone="secondary"
            style={[estilos.contador, excede && estilos.error]}>
            {`${sesion.valor.length}/${limite}`}
          </ThemedText>
        </View>
      </ScrollView>

      <BarraHerramientasEditor
        modo="markdown"
        estados={{}}
        puedeDeshacer={sesion.puedeDeshacer}
        puedeRehacer={sesion.puedeRehacer}
        editable={editable}
        onDeshacer={deshacer}
        onRehacer={rehacer}
        onComando={ejecutarComando}
        onOcultarTeclado={() => Keyboard.dismiss()}
        mostrarAlternarMarkdown={false}
      />

      <HojaEnlaceComunicado
        abierto={hojaEnlace}
        haySeleccion={seleccionEnlace.end > seleccionEnlace.start}
        puedeQuitar={false}
        onCerrar={() => setHojaEnlace(false)}
        onAplicar={(url, texto) => {
          const resultado = aplicarEnlaceMarkdown(
            sesion.valor,
            seleccionEnlace,
            url,
            texto,
          );
          registrar(resultado.texto, {
            start: resultado.inicio,
            end: resultado.fin,
          });
        }}
        onQuitar={() => undefined}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: colors.bg.surface,
  },
  scroll: { flex: 1 },
  contenido: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xs,
  },
  titulo: {
    color: colors.text.primary,
    fontFamily: fontFamily.semibold,
    fontSize: typography.size.headline,
    lineHeight: typography.lineHeight.headline,
    padding: 0,
  },
  etiqueta: {
    marginTop: spacing.md,
  },
  markdown: {
    minHeight: 360,
    color: colors.text.primary,
    fontFamily: 'monospace',
    fontSize: typography.size.bodySm,
    lineHeight: typography.lineHeight.bodySm + 4,
    padding: 0,
    textAlignVertical: 'top',
  },
  pieDocumento: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  contador: { marginLeft: 'auto' },
  error: { color: colors.status.danger },
});
