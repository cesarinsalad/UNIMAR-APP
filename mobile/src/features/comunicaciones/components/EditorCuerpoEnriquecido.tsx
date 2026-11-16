import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  Platform,
  StyleSheet,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { EnrichedMarkdownTextInput } from 'react-native-enriched-markdown';
import type {
  EnrichedMarkdownTextInputInstance,
  StyleState,
} from 'react-native-enriched-markdown';

import {
  colors,
  fontFamily,
  typography,
} from '@/shared/ui/theme';

export interface EditorCuerpoEnriquecidoProps {
  /** Markdown inicial: el input nativo solo lo consume al montar. */
  valorInicial: string;
  onChangeMarkdown: (markdown: string) => void;
  onChangeSelection?: (selection: { start: number; end: number }) => void;
  onChangeState?: (state: StyleState) => void;
  /** Snapshot externo aplicado tras undo/redo (el input es no controlado). */
  revision?: number;
  valorExterno?: string;
  seleccionExterna?: { start: number; end: number };
  editable?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<TextStyle>;
  onFocus?: () => void;
  onBlur?: () => void;
  onPress?: () => void;
}

/**
 * Input enriquecido nativo del documento. Es deliberadamente bajo nivel:
 * la barra, el historial, el enlace y el modo Markdown viven en el paso del
 * asistente. Así la barra puede flotar sobre el teclado y el editor puede
 * montarse/desmontarse sin arrastrar chrome de formulario.
 */
export const EditorCuerpoEnriquecido = forwardRef<
  EnrichedMarkdownTextInputInstance,
  EditorCuerpoEnriquecidoProps
>(function EditorCuerpoEnriquecido(
  {
    valorInicial,
    onChangeMarkdown,
    onChangeSelection,
    onChangeState,
    revision = 0,
    valorExterno,
    seleccionExterna,
    editable = true,
    autoFocus = false,
    placeholder = 'Empieza a escribir…',
    accessibilityLabel = 'Cuerpo del comunicado',
    accessibilityHint,
    style,
    onFocus,
    onBlur,
    onPress,
  },
  ref,
) {
  const editorRef = useRef<EnrichedMarkdownTextInputInstance>(null);
  const revisionAplicada = useRef(revision);
  const valorExternoRef = useRef(valorExterno);
  const seleccionExternaRef = useRef(seleccionExterna);
  valorExternoRef.current = valorExterno;
  seleccionExternaRef.current = seleccionExterna;

  useImperativeHandle(
    ref,
    () => editorRef.current as EnrichedMarkdownTextInputInstance,
  );

  // Solo una nueva revisión aplica un snapshot. Los props cambian en cada
  // tecla; depender de ellos cancelaba el frame que restauraba la selección.
  useEffect(() => {
    if (revision === revisionAplicada.current) return;
    revisionAplicada.current = revision;
    editorRef.current?.setValue(valorExternoRef.current ?? '');
    const seleccion = seleccionExternaRef.current ?? { start: 0, end: 0 };
    // setValue y setSelection son comandos nativos independientes: el frame
    // siguiente garantiza que el documento ya fue reemplazado.
    const frame = requestAnimationFrame(() => {
      editorRef.current?.setSelection(seleccion.start, seleccion.end);
    });
    return () => cancelAnimationFrame(frame);
  }, [revision]);

  const estiloCampo = StyleSheet.flatten([estilos.textarea, style]);

  return (
    <EnrichedMarkdownTextInput
      ref={editorRef}
      defaultValue={valorInicial}
      editable={editable}
      autoFocus={autoFocus}
      {...(accesoribilidad(
        Platform.OS === 'web',
        accessibilityLabel,
        accessibilityHint,
      ) as unknown as {
        accessibilityLabel?: string;
        accessibilityHint?: string;
      })}
      placeholder={placeholder}
      placeholderTextColor={colors.text.secondary}
      markdownShortcuts={{ heading: true, unorderedList: true, orderedList: true }}
      markdownStyle={estilosMarkdown}
      cursorColor={colors.brand.primary}
      selectionColor={colors.brand.primary}
      autoCapitalize="sentences"
      onFocus={onFocus}
      onBlur={onBlur}
      onPress={onPress}
      onChangeMarkdown={onChangeMarkdown}
      onChangeSelection={onChangeSelection}
      onChangeState={onChangeState}
      // El documento vive dentro del ScrollView del paso y crece con él.
      scrollEnabled={false}
      selectionMenuConfig={MENU_SELECCION}
      formatMenuConfig={MENU_FORMATO}
      style={Platform.OS === 'web' ? estiloCssWeb(estiloCampo) : estiloCampo}
    />
  );
});

/**
 * La variante web de la lib extiende atributos DOM, no props de RN: React
 * advertiría por `accessibilityLabel`/`accessibilityHint` en un `<div>`. Se
 * traducen a su equivalente aria; el filtro `nativeInputProps` de la lib se
 * encarga del resto (markdownShortcuts, onPress, scrollEnabled…).
 */
function accesoribilidad(
  web: boolean,
  etiqueta: string | undefined,
  pista: string | undefined,
): Record<string, string | undefined> {
  if (web) {
    return { 'aria-label': etiqueta, 'aria-description': pista };
  }
  return { accessibilityLabel: etiqueta, accessibilityHint: pista };
}

const PROPIEDADES_CSS = [
  'color',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontWeight',
  'lineHeight',
  'minHeight',
  'padding',
  'paddingTop',
  'paddingBottom',
  'textAlign',
] as const;

/** Propiedades de la hoja que en RN van en px y en CSS necesitan unidad. */
const PROPIEDADES_EN_PX = new Set<(typeof PROPIEDADES_CSS)[number]>([
  'fontSize',
  'lineHeight',
  'minHeight',
  'padding',
  'paddingTop',
  'paddingBottom',
]);

/**
 * La variante web pide CSSProperties. Los alias de RN (paddingHorizontal,
 * textAlignVertical) no existen en CSS y React los reportaría como
 * inválidos; el resto de la hoja ya es CSS válido (color, fuente, tamaño).
 */
function estiloCssWeb(
  estilo: TextStyle,
): Record<string, string | number> {
  const css: Record<string, string | number> = {};
  for (const propiedad of PROPIEDADES_CSS) {
    const valor = estilo[propiedad];
    if (valor === undefined) continue;
    // RN mide en píxeles; CSS interpreta un `line-height` sin unidad como
    // multiplicador (24 → 24 × fontSize). El resto de dimensiones se
    // declaran también en px para no depender de la inferencia de React.
    css[propiedad] =
      typeof valor === 'number' && PROPIEDADES_EN_PX.has(propiedad)
        ? `${valor}px`
        : (valor as string | number);
  }
  // El <div contentEditable> de la lib conserva el outline del navegador;
  // el foco se comunica con el borde de la caja que lo envuelve.
  css.outlineStyle = 'none';
  // El cuerpo es texto de lectura: alineado a la izquierda, sin heredar
  // centrados de contenedores ajenos al editor.
  css.textAlign ??= 'left';
  return css;
}

/** Configuraciones constantes: no se recrean en cada tecla. */
const MENU_SELECCION = {
  format: { label: 'Formato' },
  copyAsMarkdown: { label: 'Copiar como Markdown' },
} as const;

const MENU_FORMATO = {
  bold: { label: 'Negrita' },
  italic: { label: 'Cursiva' },
  underline: { enabled: false },
  strikethrough: { label: 'Tachado' },
  spoiler: { enabled: false },
  link: { label: 'Enlace' },
} as const;

/**
 * Tipografía espejo de `CuerpoMarkdown`: lo escrito en el lienzo conserva
 * las medidas del lector. 1.2.0 corrigió el interlineado Android (antes
 * restaba DIP contra píxeles y superponía líneas).
 */
const estilosMarkdown = {
  strong: { color: colors.text.primary },
  em: { color: colors.text.primary },
  link: { color: colors.brand.primary, underline: true },
  h1: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  h2: {
    fontSize: typography.size.subtitle,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  h3: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  h4: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  h5: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  h6: {
    fontSize: typography.size.bodySm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  list: { itemSpacing: 4 },
} as const;

const estilos = StyleSheet.create({
  textarea: {
    color: colors.text.primary,
    fontFamily: fontFamily.regular,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    minHeight: 340,
    paddingHorizontal: 0,
    paddingVertical: 0,
    textAlignVertical: 'top',
  },
});
