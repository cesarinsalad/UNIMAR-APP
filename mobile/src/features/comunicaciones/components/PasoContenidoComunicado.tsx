import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
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

import {
  colors,
  fontFamily,
  radius,
  sinAnilloNativo,
  spacing,
  typography,
} from '@/shared/ui/theme';
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

const AVISO_MARKDOWN =
  'Este comunicado usa formato que la edición visual no puede conservar. Se muestra en Markdown para no perder contenido.';

/** Reintentos si el editor nativo aún no tiene el documento listo al montar. */
const REINTENTOS_VERIFICACION = 3;

/**
 * Lienzo del comunicado (móvil y web): título y cuerpo dentro de cajas con
 * borde gris (azul al enfocar, igual que TextField); el cuerpo es enriquecido. El formato solo entra por la barra
 * de botones (o por los atajos de tecleo del propio motor nativo; la web no
 * los tiene y su serializador escapa el Markdown literal); el modo Markdown
 * crudo NO es alcanzable por el usuario y solo aparece como fallback
 * automático cuando el contenido inicial no puede representarse visualmente.
 * La barra flota sobre el IME y opera el motor nativo.
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
  // En render, no en módulo: cada bundle ya sabe su plataforma, pero así el
  // comportamiento es verificable por test.
  const esWeb = Platform.OS === 'web';
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
  // Alto = alto real del contenido (una línea al inicio): el texto queda
  // centrado en la caja sin sobrante inferior.
  const [altoTitulo, setAltoTitulo] = useState<number>(
    typography.lineHeight.headline,
  );
  const [tituloEnfocado, setTituloEnfocado] = useState(false);
  const [cuerpoEnfocado, setCuerpoEnfocado] = useState(false);
  const [hojaEnlace, setHojaEnlace] = useState(false);
  const [seleccionEnlace, setSeleccionEnlace] =
    useState<SeleccionEditor>(SELECCION_INICIAL);
  const [verificandoMarkdown, setVerificandoMarkdown] = useState(
    // Al editar un comunicado existente se verifica el round-trip desde el
    // primer render; un comunicado nuevo (vacío) no tiene nada que verificar.
    () => sesion.valor.trim() !== '',
  );
  const [avisoMarkdown, setAvisoMarkdown] = useState<string | null>(null);
  const seleccionRef = useRef<SeleccionEditor>(SELECCION_INICIAL);
  const tipoCambioRef = useRef<'texto' | 'formato'>('texto');
  const reenfocarAlCerrarRef = useRef(false);
  const verificacionPendienteRef = useRef<string | null>(
    sesion.valor.trim() !== '' ? sesion.valor : null,
  );

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
   * Fallback automático (sin botón que lo fuerce): el motor visual no
   * soporta tablas, citas ni bloques de código. Antes de confiarle el
   * contenido inicial comparamos el Markdown que el editor vuelve a
   * serializar con el original; si cambia, se muestra el Markdown crudo
   * para no perderlo. El contenido que el usuario produce con los botones
   * siempre redondea, así que el fallback solo afecta a contenido externo.
   * El paso se remonta al navegar entre pasos, así que la re-verificación
   * ocurre en cada reentrada.
   */
  useEffect(() => {
    if (modo !== 'visual' || !verificandoMarkdown) return;
    const original = verificacionPendienteRef.current;
    if (original === null) return;
    let cancelado = false;
    let frame = 0;

    const verificar = async (intento: number): Promise<void> => {
      let normalizado: string | null;
      try {
        normalizado = (await editorRef.current?.getMarkdown()) ?? null;
      } catch {
        // Fallo del puente nativo: no es evidencia de nada.
        normalizado = null;
      }
      if (cancelado) return;
      // El editor puede no estar listo en el primer frame: una serialización
      // vacía frente a contenido no vacío no demuestra nada. Se reintenta y,
      // agotados los reintentos, se prefiere visual (conservador: nunca se
      // cae a Markdown crudo por ruido de medición).
      if ((normalizado === null || normalizado === '') && original !== '') {
        if (intento < REINTENTOS_VERIFICACION) {
          frame = requestAnimationFrame(() => void verificar(intento + 1));
          return;
        }
        verificacionPendienteRef.current = null;
        setVerificandoMarkdown(false);
        return;
      }
      verificacionPendienteRef.current = null;
      setVerificandoMarkdown(false);
      if (normalizado !== original) {
        setModo('markdown');
        setAvisoMarkdown(AVISO_MARKDOWN);
      } else {
        setAvisoMarkdown(null);
      }
    };

    frame = requestAnimationFrame(() => void verificar(0));
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

  function ejecutarComando(comando: ComandoEditor) {
    if (!editable) return;
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
    if (modo !== 'visual') {
      const enCrudo = aplicarEnlaceMarkdown(
        sesion.valor,
        seleccionEnlace,
        url,
        texto,
      );
      registrarMarkdown(enCrudo.texto, {
        start: enCrudo.inicio,
        end: enCrudo.fin,
      });
      return;
    }

    if (esWeb) {
      // La build web del motor no implementa setLink/insertLink: se aplica la
      // transformación Markdown y se re-importa el documento. El import
      // reporta el cambio por onChangeMarkdown, que actualiza la sesión
      // (con tipoCambio 'formato' entra como paso de formato al historial).
      const enVisual = aplicarEnlaceMarkdown(
        sesion.valor,
        seleccionEnlace,
        url,
        texto,
      );
      tipoCambioRef.current = 'formato';
      editorRef.current?.setValue(enVisual.texto);
      editorRef.current?.setSelection(enVisual.inicio, enVisual.fin);
      return;
    }

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
  }

  function quitarEnlace() {
    if (modo !== 'visual' || esWeb) return;
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
        }
      : {};

  const excede = sesion.valor.length > limite;
  const contenidoEditable = editable && !verificandoMarkdown;

  const documento = (
    <>
      <View
        testID="caja-titulo"
        style={[estilos.caja, tituloEnfocado && estilos.cajaEnfocada]}>
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
            setAltoTitulo(
              Math.max(
                typography.lineHeight.headline,
                Math.ceil(e.nativeEvent.contentSize.height),
              ),
            )
          }
          style={[estilos.titulo, { height: altoTitulo }]}
        />
      </View>
      {errorTitulo ? (
        <ThemedText variant="caption" style={estilos.error}>
          {errorTitulo}
        </ThemedText>
      ) : null}

      <View
        testID="caja-cuerpo"
        style={[estilos.caja, estilos.cajaCuerpo, cuerpoEnfocado && estilos.cajaEnfocada]}>
        {modo === 'visual' ? (
          <EditorCuerpoEnriquecido
            ref={editorRef}
            valorInicial={sesion.valor}
            valorExterno={sesion.valor}
            seleccionExterna={sesion.seleccion}
            revision={sesion.revision}
            editable={contenidoEditable}
            accessibilityHint={errorCuerpo}
            onFocus={() => setCuerpoEnfocado(true)}
            onBlur={() => setCuerpoEnfocado(false)}
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
              onFocus={() => setCuerpoEnfocado(true)}
              onBlur={() => setCuerpoEnfocado(false)}
              style={estilos.markdown}
            />
          </View>
        )}
      </View>

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
    </>
  );

  const barra = (
    <BarraHerramientasEditor
      estados={estados}
      puedeDeshacer={sesion.puedeDeshacer}
      puedeRehacer={sesion.puedeRehacer}
      editable={contenidoEditable}
      onDeshacer={deshacer}
      onRehacer={rehacer}
      onComando={ejecutarComando}
      onOcultarTeclado={() => Keyboard.dismiss()}
    />
  );

  return (
    <View style={estilos.contenedor}>
      {esWeb ? (
        // La build web de react-native-keyboard-controller no implementa su
        // maquinaria de teclado y KeyboardAwareScrollView revienta al montar
        // ("PromiseResolve called on non-object"). En web no hay IME: basta
        // un ScrollView normal.
        <ScrollView
          testID="scroll-web"
          style={estilos.scroll}
          contentContainerStyle={estilos.contenido}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {documento}
        </ScrollView>
      ) : (
        <KeyboardAwareScrollView
          style={estilos.scroll}
          contentContainerStyle={estilos.contenido}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          bottomOffset={72}
          extraKeyboardSpace={0}>
          {documento}
        </KeyboardAwareScrollView>
      )}

      {/* En web no hay IME que tape la barra: se muestra siempre. En móvil
          se oculta mientras el título está enfocado (el foco vuelve al
          cerrarse el teclado; el usuario no edita dos campos a la vez). */}
      {!(!esWeb && tituloEnfocado) ? (
        esWeb ? (
          <View testID="barra-web" style={estilos.barraFlotante}>
            {barra}
          </View>
        ) : (
          <KeyboardStickyView
            style={estilos.barraFlotante}
            offset={{ closed: insets.bottom, opened: 0 }}>
            {barra}
          </KeyboardStickyView>
        )
      ) : null}

      {/* La web no implementa removeLink: no se ofrece quitar el enlace. */}
      <HojaEnlaceComunicado
        abierto={hojaEnlace}
        haySeleccion={seleccionEnlace.end > seleccionEnlace.start}
        puedeQuitar={!esWeb && modo === 'visual' && Boolean(estadoNativo?.link.isActive)}
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
  /** Caja de campo (misma piel que TextField): borde sutil, azul al enfocar. */
  caja: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg.surface,
  },
  cajaEnfocada: {
    borderColor: colors.brand.primary,
  },
  /** Aire extra entre el campo de título y el cuerpo (además del gap del lienzo). */
  cajaCuerpo: {
    marginTop: spacing.lg,
  },
  titulo: {
    color: colors.text.primary,
    fontFamily: fontFamily.semibold,
    fontSize: typography.size.headline,
    lineHeight: typography.lineHeight.headline,
    padding: 0,
    // Centrado vertical dentro de la caja (Android; en iOS/web el alto ya es
    // el del contenido y el padding simétrico de la caja lo centra).
    textAlignVertical: 'center',
    // Android: sin padding de fuente que descuadre el centrado.
    includeFontPadding: false,
    // El foco se ve en el borde de la caja; sin anillo nativo del navegador.
    ...sinAnilloNativo,
  },
  bloqueMarkdown: {
    gap: spacing.sm,
    // La caja ya aporta el aire superior.
    paddingTop: 0,
  },
  markdown: {
    minHeight: 340,
    color: colors.text.primary,
    fontFamily: 'monospace',
    fontSize: typography.size.bodySm,
    lineHeight: typography.lineHeight.bodySm + 4,
    padding: 0,
    textAlignVertical: 'top',
    ...sinAnilloNativo,
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
