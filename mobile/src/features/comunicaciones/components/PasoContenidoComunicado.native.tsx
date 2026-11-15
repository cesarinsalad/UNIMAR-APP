import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputContentSizeChangeEventData,
  type TextInputSelectionChangeEventData,
} from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type {
  EnrichedMarkdownTextInputInstance,
  StyleState,
} from 'react-native-enriched-markdown';

import { colors, fontFamily, spacing, typography } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/ThemedText';

import { BarraHerramientasEditor } from './BarraHerramientasEditor';
import { EditorCuerpoEnriquecido } from './EditorCuerpoEnriquecido';
import { HojaEnlaceComunicado } from './HojaEnlaceComunicado';
import type { ComandoEditor, EstadosComandos } from './comandosEditor';
import {
  aplicarComandoMarkdown,
  aplicarEnlaceMarkdown,
} from './editorMarkdown.acciones';
import type { SeleccionEditor } from './editorCuerpo.acciones';
import type { PasoContenidoComunicadoProps } from './PasoContenidoComunicado.types';

const SELECCION_INICIAL: SeleccionEditor = { start: 0, end: 0 };

/**
 * Lienzo nativo del comunicado: una sola superficie de lectura con título
 * borderless y cuerpo enriquecido; el modo Markdown es una alternativa
 * explícita. La barra flota sobre el IME y opera tanto el motor nativo como
 * las transformaciones puras del modo texto.
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
  const insets = useSafeAreaInsets();
  const editorRef = useRef<EnrichedMarkdownTextInputInstance>(null);
  const editorMarkdownRef = useRef<TextInput>(null);
  const [modo, setModo] = useState<'visual' | 'markdown'>('visual');
  const [estadoNativo, setEstadoNativo] = useState<StyleState | null>(null);
  const [seleccionVisual, setSeleccionVisual] =
    useState<SeleccionEditor>(SELECCION_INICIAL);
  const [seleccionMarkdown, setSeleccionMarkdown] =
    useState<SeleccionEditor>(SELECCION_INICIAL);
  const [seleccionForzada, setSeleccionForzada] =
    useState<SeleccionEditor | null>(null);
  const [altoTitulo, setAltoTitulo] = useState(42);
  const [tituloEnfocado, setTituloEnfocado] = useState(false);
  const [hojaEnlace, setHojaEnlace] = useState(false);
  const [seleccionEnlace, setSeleccionEnlace] =
    useState<SeleccionEditor>(SELECCION_INICIAL);
  const [cambiandoModo, setCambiandoModo] = useState(false);
  const [verificandoMarkdown, setVerificandoMarkdown] = useState(false);
  const [avisoMarkdown, setAvisoMarkdown] = useState<string | null>(null);
  const seleccionRef = useRef<SeleccionEditor>(SELECCION_INICIAL);
  const tipoCambioRef = useRef<'texto' | 'formato'>('texto');
  const reenfocarAlCerrarRef = useRef(false);
  const verificacionPendienteRef = useRef<string | null>(null);

  const seleccionActual =
    modo === 'visual' ? seleccionVisual : seleccionMarkdown;

  useEffect(() => {
    seleccionRef.current = seleccionActual;
  }, [seleccionActual]);

  useEffect(() => {
    if (!seleccionForzada) return;
    const frame = requestAnimationFrame(() => setSeleccionForzada(null));
    return () => cancelAnimationFrame(frame);
  }, [seleccionForzada]);

  /**
   * El motor visual no soporta tablas, citas ni bloques de código. Antes de
   * aceptar la conversión desde Markdown comparamos el Markdown que el
   * editor puede volver a serializar; si cambia, se mantiene el modo texto.
   */
  useEffect(() => {
    if (modo !== 'visual' || !verificandoMarkdown) return;
    const original = verificacionPendienteRef.current;
    if (original === null) return;
    let cancelado = false;
    const frame = requestAnimationFrame(() => {
      void (async () => {
        let normalizado: string;
        try {
          normalizado =
            (await editorRef.current?.getMarkdown()) ?? original;
        } catch {
          normalizado = original;
        }
        if (cancelado) return;
        verificacionPendienteRef.current = null;
        setVerificandoMarkdown(false);
        if (normalizado !== original) {
          setModo('markdown');
          setAvisoMarkdown(
            'Este Markdown usa formato que la edición visual no puede conservar. Sigues en modo Markdown para no perder contenido.',
          );
        } else {
          setAvisoMarkdown(null);
        }
      })();
    });
    return () => {
      cancelado = true;
      cancelAnimationFrame(frame);
    };
  }, [modo, verificandoMarkdown]);

  function cambiarSeleccionVisual(seleccion: SeleccionEditor) {
    setSeleccionVisual(seleccion);
    seleccionRef.current = seleccion;
    // Mantiene el caret del snapshot al día para que undo/redo lo restaure
    // en el punto donde estaba el usuario, no un carácter antes.
    sesion.registrar(sesion.valor, seleccion);
  }

  function cambiarSeleccionMarkdown(
    e: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) {
    const seleccion = e.nativeEvent.selection;
    setSeleccionMarkdown(seleccion);
    seleccionRef.current = seleccion;
    sesion.registrar(sesion.valor, seleccion);
  }

  function cambiarMarkdown(markdown: string) {
    sesion.registrar(markdown, seleccionRef.current, tipoCambioRef.current);
    tipoCambioRef.current = 'texto';
  }

  function registrarMarkdown(markdown: string, seleccion: SeleccionEditor) {
    sesion.registrar(markdown, seleccion, 'formato');
    setSeleccionMarkdown(seleccion);
    setSeleccionForzada(seleccion);
  }

  async function alternarModo() {
    if (!editable || cambiandoModo) return;
    if (modo === 'markdown') {
      verificacionPendienteRef.current = sesion.valor;
      setAvisoMarkdown(null);
      setVerificandoMarkdown(true);
      setModo('visual');
      return;
    }

    setCambiandoModo(true);
    Keyboard.dismiss();
    let markdown = sesion.valor;
    try {
      markdown = (await editorRef.current?.getMarkdown()) ?? markdown;
    } catch {
      // Fallback: el último Markdown emitido por onChangeMarkdown.
    }
    sesion.registrar(markdown, seleccionRef.current, 'formato');
    setAvisoMarkdown(null);
    setModo('markdown');
    setCambiandoModo(false);
  }

  function ejecutarComando(comando: ComandoEditor) {
    if (!editable) return;
    if (comando === 'alternarMarkdown') {
      void alternarModo();
      return;
    }
    if (comando === 'enlace') {
      Keyboard.dismiss();
      setSeleccionEnlace({ ...seleccionRef.current });
      setHojaEnlace(true);
      return;
    }

    if (modo === 'visual') {
      tipoCambioRef.current = 'formato';
      switch (comando) {
        case 'negrita':
          editorRef.current?.toggleBold();
          break;
        case 'cursiva':
          editorRef.current?.toggleItalic();
          break;
        case 'tachado':
          editorRef.current?.toggleStrikethrough();
          break;
        case 'h1':
          editorRef.current?.toggleHeading(1);
          break;
        case 'h2':
          editorRef.current?.toggleHeading(2);
          break;
        case 'h3':
          editorRef.current?.toggleHeading(3);
          break;
        case 'vinetas':
          editorRef.current?.toggleUnorderedList();
          break;
        case 'numerada':
          editorRef.current?.toggleOrderedList();
          break;
        case 'indentar':
          editorRef.current?.indentList();
          break;
        case 'desindentar':
          editorRef.current?.outdentList();
          break;
      }
      return;
    }

    const resultado = aplicarComandoMarkdown(
      sesion.valor,
      seleccionRef.current,
      comando,
    );
    registrarMarkdown(resultado.texto, {
      start: resultado.inicio,
      end: resultado.fin,
    });
  }

  function aplicarEnlace(url: string, texto: string) {
    reenfocarAlCerrarRef.current = true;
    if (modo === 'visual') {
      tipoCambioRef.current = 'formato';
      editorRef.current?.setSelection(
        seleccionEnlace.start,
        seleccionEnlace.end,
      );
      if (seleccionEnlace.end > seleccionEnlace.start) {
        editorRef.current?.setLink(url);
      } else {
        editorRef.current?.insertLink(texto, url);
      }
      return;
    }

    const resultado = aplicarEnlaceMarkdown(
      sesion.valor,
      seleccionEnlace,
      url,
      texto,
    );
    registrarMarkdown(resultado.texto, {
      start: resultado.inicio,
      end: resultado.fin,
    });
  }

  function quitarEnlace() {
    if (modo !== 'visual') return;
    tipoCambioRef.current = 'formato';
    reenfocarAlCerrarRef.current = true;
    editorRef.current?.removeLink();
  }

  function cerrarHojaEnlace() {
    setHojaEnlace(false);
    if (!reenfocarAlCerrarRef.current) return;
    reenfocarAlCerrarRef.current = false;
    requestAnimationFrame(() => {
      if (modo === 'visual') editorRef.current?.focus();
      else editorMarkdownRef.current?.focus();
    });
  }

  function deshacer() {
    const seleccion = sesion.deshacer();
    if (modo === 'markdown' && seleccion) {
      setSeleccionMarkdown(seleccion);
      setSeleccionForzada(seleccion);
    }
  }

  function rehacer() {
    const seleccion = sesion.rehacer();
    if (modo === 'markdown' && seleccion) {
      setSeleccionMarkdown(seleccion);
      setSeleccionForzada(seleccion);
    }
  }

  const estados: EstadosComandos =
    modo === 'visual' && estadoNativo
      ? {
          negrita: estadoNativo.bold.isActive,
          cursiva: estadoNativo.italic.isActive,
          tachado: estadoNativo.strikethrough.isActive,
          h1: estadoNativo.heading.isActive && estadoNativo.heading.level === 1,
          h2: estadoNativo.heading.isActive && estadoNativo.heading.level === 2,
          h3: estadoNativo.heading.isActive && estadoNativo.heading.level === 3,
          vinetas: estadoNativo.unorderedList.isActive,
          numerada: estadoNativo.orderedList.isActive,
          enlace: estadoNativo.link.isActive,
          alternarMarkdown: false,
        }
      : { alternarMarkdown: modo === 'markdown' };

  const excede = sesion.valor.length > limite;
  const contenidoEditable = editable && !cambiandoModo && !verificandoMarkdown;

  return (
    <View style={estilos.contenedor}>
      <KeyboardAwareScrollView
        style={estilos.scroll}
        contentContainerStyle={estilos.contenido}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        bottomOffset={72}
        extraKeyboardSpace={0}>
        <TextInput
          accessibilityLabel="Título del comunicado"
          accessibilityHint={errorTitulo}
          value={titulo}
          onChangeText={onCambiarTitulo}
          placeholder="Título del comunicado"
          placeholderTextColor={colors.text.secondary}
          editable={editable}
          multiline
          scrollEnabled={false}
          maxLength={200}
          onFocus={() => setTituloEnfocado(true)}
          onBlur={() => setTituloEnfocado(false)}
          onContentSizeChange={(
            e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>,
          ) =>
            setAltoTitulo(Math.max(42, Math.ceil(e.nativeEvent.contentSize.height)))
          }
          style={[estilos.titulo, { height: altoTitulo }]}
        />
        {errorTitulo ? (
          <ThemedText variant="caption" style={estilos.error}>
            {errorTitulo}
          </ThemedText>
        ) : null}

        {modo === 'visual' ? (
          <EditorCuerpoEnriquecido
            ref={editorRef}
            valorInicial={sesion.valor}
            valorExterno={sesion.valor}
            seleccionExterna={sesion.seleccion}
            revision={sesion.revision}
            editable={contenidoEditable}
            accessibilityHint={errorCuerpo}
            onChangeMarkdown={cambiarMarkdown}
            onChangeSelection={cambiarSeleccionVisual}
            onChangeState={setEstadoNativo}
          />
        ) : (
          <View style={estilos.bloqueMarkdown}>
            <ThemedText variant="caption" tone="secondary">
              Markdown
            </ThemedText>
            {avisoMarkdown ? (
              <ThemedText variant="caption" style={estilos.avisoMarkdown}>
                {avisoMarkdown}
              </ThemedText>
            ) : null}
            <TextInput
              ref={editorMarkdownRef}
              accessibilityLabel="Cuerpo del comunicado en Markdown"
              accessibilityHint={errorCuerpo}
              value={sesion.valor}
              onChangeText={(markdown) => {
                setAvisoMarkdown(null);
                sesion.registrar(markdown, seleccionRef.current, 'texto');
              }}
              onSelectionChange={cambiarSeleccionMarkdown}
              selection={seleccionForzada ?? undefined}
              editable={editable}
              multiline
              scrollEnabled={false}
              autoCapitalize="sentences"
              autoCorrect={false}
              placeholder="Empieza a escribir…"
              placeholderTextColor={colors.text.secondary}
              style={estilos.markdown}
            />
          </View>
        )}

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
      </KeyboardAwareScrollView>

      {tituloEnfocado ? null : (
        <KeyboardStickyView
          style={estilos.barraFlotante}
          offset={{ closed: insets.bottom, opened: 0 }}>
          <BarraHerramientasEditor
            modo={modo}
            estados={estados}
            puedeDeshacer={sesion.puedeDeshacer}
            puedeRehacer={sesion.puedeRehacer}
            editable={contenidoEditable}
            onDeshacer={deshacer}
            onRehacer={rehacer}
            onComando={ejecutarComando}
            onOcultarTeclado={() => Keyboard.dismiss()}
          />
        </KeyboardStickyView>
      )}

      <HojaEnlaceComunicado
        abierto={hojaEnlace}
        haySeleccion={seleccionEnlace.end > seleccionEnlace.start}
        puedeQuitar={modo === 'visual' && Boolean(estadoNativo?.link.isActive)}
        onCerrar={cerrarHojaEnlace}
        onAplicar={aplicarEnlace}
        onQuitar={quitarEnlace}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: colors.bg.surface,
  },
  scroll: {
    flex: 1,
  },
  contenido: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    // La barra flota; este aire evita que el último bloque quede debajo.
    paddingBottom: 140,
    gap: spacing.xs,
  },
  titulo: {
    color: colors.text.primary,
    fontFamily: fontFamily.semibold,
    fontSize: typography.size.headline,
    lineHeight: typography.lineHeight.headline,
    padding: 0,
    textAlignVertical: 'top',
  },
  bloqueMarkdown: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  markdown: {
    minHeight: 340,
    color: colors.text.primary,
    fontFamily: 'monospace',
    fontSize: typography.size.bodySm,
    lineHeight: typography.lineHeight.bodySm + 4,
    padding: 0,
    textAlignVertical: 'top',
  },
  pieDocumento: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  contador: {
    marginLeft: 'auto',
  },
  error: {
    color: colors.status.danger,
  },
  avisoMarkdown: {
    color: colors.status.danger,
  },
  barraFlotante: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
