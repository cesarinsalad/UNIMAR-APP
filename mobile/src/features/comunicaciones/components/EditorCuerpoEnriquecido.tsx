import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  LinkSimpleIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  TextBIcon,
  TextHTwoIcon,
  TextItalicIcon,
  TextUnderlineIcon,
} from 'phosphor-react-native';
import { EnrichedMarkdownTextInput } from 'react-native-enriched-markdown';
import type { EnrichedMarkdownTextInputInstance, StyleState } from 'react-native-enriched-markdown';

// Imports de archivo (no del barrel '@/shared/ui'): el barril jala
// PressableScale → reanimated/worklets que no corre en el entorno Jest.
import { colors, fontFamily, radius, spacing, typography } from '@/shared/ui/theme';
import { ThemedButton } from '@/shared/ui/ThemedButton';
import { ThemedText } from '@/shared/ui/ThemedText';
import { TextField } from '@/shared/ui/TextField';

export interface EditorCuerpoEnriquecidoProps {
  /** Markdown inicial (solo on-mount: el editor es no controlado). */
  valorInicial: string;
  onChangeMarkdown: (markdown: string) => void;
  editable?: boolean;
  error?: string;
  placeholder?: string;
  limite?: number;
}

interface BotonAccion {
  id: string;
  etiqueta: string;
  activo: (estado: StyleState) => boolean;
  ejecutar: (ref: EnrichedMarkdownTextInputInstance | null) => void;
}

/**
 * Editor enriquecido nativo del cuerpo (react-native-enriched-markdown):
 * WYSIWYG en vivo con output Markdown — el comunicador ve negrita,
 * títulos y listas formateadas mientras escribe, sin ver `**`.
 *
 * Notion-style: la barra alterna el formato por el comunicador Y se
 * resalta según el estilo bajo el cursor (`onChangeState`); los atajos
 * `# `, `- `, `1. ` convierten el bloque en vivo. Enter continúa listas
 * y Backspace al inicio sale de ellas — todo nativo de la librería.
 *
 * Difiere del `EditorCuerpo` (web): el input es NO controlado — recibe
 * `valorInicial` al montar y desde ahí emite markdown por
 * `onChangeMarkdown`; el límite no lo impone el editor (no soporta
 * `maxLength`) sino la validación del formulario al guardar, con el
 * contador en rojo como aviso temprano.
 */
export const EditorCuerpoEnriquecido = forwardRef<
  EnrichedMarkdownTextInputInstance,
  EditorCuerpoEnriquecidoProps
>(function EditorCuerpoEnriquecido(
  {
    valorInicial,
    onChangeMarkdown,
    editable = true,
    error,
    placeholder = 'Escribe el cuerpo del comunicado…',
    limite = 5000,
  },
  ref,
) {
  // Ref interno al input nativo; el forwardRef de arriba lo expone para
  // que el formulario (o tests) accedan a la API imperativa si hace falta.
  const editorRef = useRef<EnrichedMarkdownTextInputInstance>(null);

  useImperativeHandle(ref, () => editorRef.current as EnrichedMarkdownTextInputInstance);
  const [enfocado, setEnfocado] = useState(false);
  const [markdown, setMarkdown] = useState(valorInicial);
  const [estado, setEstado] = useState<StyleState | null>(null);
  const [seleccion, setSeleccion] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });
  // Panel de enlace: campos propios en vez de `Alert.prompt` (no existe
  // en Android) y el teclado del formulario queda vivo.
  const [panelEnlace, setPanelEnlace] = useState(false);
  const [textoEnlace, setTextoEnlace] = useState('');
  const [urlEnlace, setUrlEnlace] = useState('');

  useEffect(() => {
    // Con el guardado en curso (pendiente) el editor queda no editable;
    // un panel de enlace abierto ahí sería una calle sin salida.
    if (!editable) {
      setPanelEnlace(false);
    }
  }, [editable]);

  const conError = Boolean(error && error.length > 0);
  const excede = markdown.length > limite;
  const haySeleccion = seleccion.end > seleccion.start;

  const ACCIONES: BotonAccion[] = [
    {
      id: 'negrita',
      etiqueta: 'Negrita',
      activo: (s) => s.bold.isActive,
      ejecutar: (r) => r?.toggleBold(),
    },
    {
      id: 'cursiva',
      etiqueta: 'Cursiva',
      activo: (s) => s.italic.isActive,
      ejecutar: (r) => r?.toggleItalic(),
    },
    {
      id: 'subrayado',
      etiqueta: 'Subrayado',
      activo: (s) => s.underline.isActive,
      ejecutar: (r) => r?.toggleUnderline(),
    },
    {
      id: 'titulo',
      etiqueta: 'Título de sección',
      activo: (s) => s.heading.isActive && s.heading.level === 2,
      ejecutar: (r) => r?.toggleHeading(2),
    },
    {
      id: 'vinetas',
      etiqueta: 'Lista con viñetas',
      activo: (s) => s.unorderedList.isActive,
      ejecutar: (r) => r?.toggleUnorderedList(),
    },
    {
      id: 'numerada',
      etiqueta: 'Lista numerada',
      activo: (s) => s.orderedList.isActive,
      ejecutar: (r) => r?.toggleOrderedList(),
    },
    {
      id: 'enlace',
      etiqueta: 'Enlace',
      activo: (s) => s.link.isActive,
      // Botón de estado: sin selección muestra el panel con texto
      // + URL; con selección, solo la URL sobre el texto marcado.
      ejecutar: () => {
        if (panelEnlace) {
          setPanelEnlace(false);
          return;
        }
        setTextoEnlace('');
        setUrlEnlace('');
        setPanelEnlace(true);
      },
    },
  ];

  /** Enlace: con selección aplica la URL al texto marcado; sin selección
   *  inserta un enlace nuevo con texto propio (insertLink). */
  function aplicarEnlace() {
    const url = urlEnlace.trim();
    if (url.length === 0) return;
    if (haySeleccion) {
      editorRef.current?.setLink(url);
    } else {
      editorRef.current?.insertLink(textoEnlace.trim() || 'enlace', url);
    }
    setPanelEnlace(false);
  }

  function quitarEnlace() {
    editorRef.current?.removeLink();
    setPanelEnlace(false);
  }

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.cabecera}>
        <ThemedText variant="bodySm" weight="medium">
          Cuerpo
        </ThemedText>
        <ThemedText
          variant="caption"
          tone="secondary"
          style={excede ? estilos.contadorMax : null}>
          {`${markdown.length}/${limite}`}
        </ThemedText>
      </View>

      <View style={[estilos.panel, conError && estilos.panelError, enfocado && estilos.panelFocus]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          style={estilos.barra}>
          {ACCIONES.map((accion) => {
            const activo = estado !== null && accion.activo(estado);
            return (
              <Pressable
                key={accion.id}
                disabled={!editable}
                accessibilityRole="button"
                accessibilityLabel={accion.etiqueta}
                onPress={() => accion.ejecutar(editorRef.current)}
                style={[estilos.boton, activo && estilos.botonActivo, !editable && estilos.botonInhabilitado]}>
                <IconoAccion id={accion.id} activo={activo} />
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={estilos.divisorBarra} />

        {panelEnlace ? (
          <View style={estilos.panelEnlace}>
            <TextField
              label="URL"
              value={urlEnlace}
              onChangeText={setUrlEnlace}
              placeholder="https://unimar.edu.ve/…"
              autoCapitalize="none"
              keyboardType="url"
            />
            {!haySeleccion ? (
              <TextField
                label="Texto del enlace"
                value={textoEnlace}
                onChangeText={setTextoEnlace}
                placeholder="Texto del enlace"
              />
            ) : null}
            <View style={estilos.filaEnlace}>
              <ThemedButton title="Aplicar" size="sm" onPress={aplicarEnlace} />
              {estado?.link.isActive ? (
                <ThemedButton title="Quitar" variant="ghost" size="sm" onPress={quitarEnlace} />
              ) : null}
              <ThemedButton
                title="Cancelar"
                variant="ghost"
                size="sm"
                onPress={() => setPanelEnlace(false)}
              />
            </View>
          </View>
        ) : null}

        <EnrichedMarkdownTextInput
          ref={editorRef}
          defaultValue={valorInicial}
          editable={editable}
          placeholder={placeholder}
          placeholderTextColor={colors.text.secondary}
          markdownShortcuts={{ heading: true, unorderedList: true, orderedList: true }}
          markdownStyle={estilosMarkdown}
          cursorColor={colors.brand.primary}
          selectionColor={colors.brand.primary}
          autoCapitalize="sentences"
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          onChangeMarkdown={(md) => {
            setMarkdown(md);
            onChangeMarkdown(md);
          }}
          onChangeState={setEstado}
          onChangeSelection={setSeleccion}
          scrollEnabled={false}
          style={estilos.textarea}
        />
      </View>

      {conError ? (
        <ThemedText variant="caption" style={estilos.error}>
          {error}
        </ThemedText>
      ) : (
        <ThemedText variant="caption" tone="secondary">
          Atajos en vivo: escribe # para título, - para viñeta, 1. para numerada — no hace falta Markdown.
        </ThemedText>
      )}
    </View>
  );
});

function IconoAccion({ id, activo }: { id: string; activo: boolean }) {
  const color = activo ? colors.brand.primary : colors.text.primary;
  const peso = 'bold' as const;
  switch (id) {
    case 'negrita':
      return <TextBIcon size={20} color={color} weight={peso} />;
    case 'cursiva':
      return <TextItalicIcon size={20} color={color} weight={peso} />;
    case 'subrayado':
      return <TextUnderlineIcon size={20} color={color} weight={peso} />;
    case 'titulo':
      return <TextHTwoIcon size={20} color={color} weight={peso} />;
    case 'vinetas':
      return <ListBulletsIcon size={20} color={color} weight={peso} />;
    case 'numerada':
      return <ListNumbersIcon size={20} color={color} weight={peso} />;
    default:
      return <LinkSimpleIcon size={20} color={color} weight={peso} />;
  }
}

/**
 * Tipografía del editor mapeada a los tokens del lector
 * (CuerpoMarkdown): h1..h6 con las medidas del tema para que lo escrito
 * en vivo se vea como lo leído; links en Azul Corporativo. El
 * `markdownStyle` del input acepta color/tamaño/peso por elemento — la
 * familia de fuente la porta el `style` del campo (body regular).
 */
const estilosMarkdown = {
  strong: { color: colors.text.primary },
  em: { color: colors.text.primary },
  link: { color: colors.brand.primary, underline: true },
  h1: { fontSize: typography.size.title, fontWeight: typography.weight.semibold },
  h2: { fontSize: typography.size.subtitle, fontWeight: typography.weight.semibold },
  h3: { fontSize: typography.size.body, fontWeight: typography.weight.semibold },
  h4: { fontSize: typography.size.body, fontWeight: typography.weight.semibold },
  h5: { fontSize: typography.size.body, fontWeight: typography.weight.semibold },
  h6: { fontSize: typography.size.bodySm, fontWeight: typography.weight.semibold },
  list: { itemSpacing: spacing.xs },
} as const;

const estilos = StyleSheet.create({
  contenedor: { gap: spacing.xs },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contadorMax: { color: colors.status.danger },
  panel: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
  },
  panelFocus: { borderColor: colors.brand.primary },
  panelError: { borderColor: colors.status.danger },
  barra: { flexGrow: 0 },
  boton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    marginHorizontal: spacing.half,
  },
  botonActivo: { backgroundColor: colors.background.sunken },
  botonInhabilitado: { opacity: 0.4 },
  divisorBarra: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginHorizontal: spacing.md,
  },
  panelEnlace: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  filaEnlace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.two,
  },
  textarea: {
    color: colors.text.primary,
    fontFamily: fontFamily.regular,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 180,
  },
  error: { color: colors.status.danger },
});
