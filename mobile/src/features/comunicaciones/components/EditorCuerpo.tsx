import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import {
  LinkSimpleIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  QuotesIcon,
  TextBIcon,
  TextHTwoIcon,
  TextItalicIcon,
} from 'phosphor-react-native';

import { colors, fontFamily, radius, spacing } from '@/shared/ui';
import { ThemedText } from '@/shared/ui/ThemedText';

import {
  aplicarPrefijo,
  envolver,
  envolverEnlace,
  type ResultadoAccion,
  type SeleccionEditor,
} from './editorCuerpo.acciones';

export interface EditorCuerpoProps {
  value: string;
  onChangeText: (v: string) => void;
  editable?: boolean;
  error?: string;
  placeholder?: string;
  maxLength?: number;
}

interface BotonAccion {
  id: string;
  etiqueta: string;
  icono: React.ReactNode;
  aplicar: (value: string, sel: SeleccionEditor) => ResultadoAccion;
}

const GRUPOS_ACCIONES: BotonAccion[][] = [
  [
    {
      id: 'negrita',
      etiqueta: 'Negrita',
      icono: <TextBIcon size={20} color={colors.text.primary} />,
      aplicar: (v, s) => envolver(v, s, '**', '**', 'texto en negrita'),
    },
    {
      id: 'cursiva',
      etiqueta: 'Cursiva',
      icono: <TextItalicIcon size={20} color={colors.text.primary} />,
      aplicar: (v, s) => envolver(v, s, '_', '_', 'texto en cursiva'),
    },
  ],
  [
    {
      id: 'titulo',
      etiqueta: 'Título de sección',
      icono: <TextHTwoIcon size={20} color={colors.text.primary} />,
      aplicar: (v, s) => aplicarPrefijo(v, s, '## '),
    },
    {
      id: 'cita',
      etiqueta: 'Cita destacada',
      icono: <QuotesIcon size={20} color={colors.text.primary} />,
      aplicar: (v, s) => aplicarPrefijo(v, s, '> '),
    },
  ],
  [
    {
      id: 'vinetas',
      etiqueta: 'Lista con viñetas',
      icono: <ListBulletsIcon size={20} color={colors.text.primary} />,
      aplicar: (v, s) => aplicarPrefijo(v, s, '- '),
    },
    {
      id: 'numerada',
      etiqueta: 'Lista numerada',
      icono: <ListNumbersIcon size={20} color={colors.text.primary} />,
      aplicar: (v, s) => aplicarPrefijo(v, s, '', true),
    },
    {
      id: 'enlace',
      etiqueta: 'Enlace',
      icono: <LinkSimpleIcon size={20} color={colors.text.primary} />,
      aplicar: (v, s) => envolverEnlace(v, s),
    },
  ],
];

/**
 * Editor del cuerpo del comunicado: panel blanco con la barra de acciones
 * Markdown pegada al borde superior (la barra ESCRIBE el formato por el
 * comunicador — nadie tiene que memorizar sintaxis) y el área de texto
 * debajo, con el anillo de foco y el contador de caracteres del
 * vocabulario de TextField.
 *
 * El caret se recoloca tras cada acción con la prop `selection`
 * transitoria: se aplica una vez y en la próxima rendición vuelve a modo
 * no controlado para no pelear con el movimiento natural del usuario.
 */
export function EditorCuerpo({
  value,
  onChangeText,
  editable = true,
  error,
  placeholder = 'Escribe el cuerpo del comunicado…',
  maxLength = 5000,
}: EditorCuerpoProps) {
  const [enfocado, setEnfocado] = useState(false);
  const [caretFijo, setCaretFijo] = useState<{ start: number; end: number } | null>(null);
  const seleccionRef = useRef<SeleccionEditor>({ start: 0, end: 0 });
  const [presionado, setPresionado] = useState<string | null>(null);

  // Impostación de caret de un solo uso: tras rendir se libera la prop
  // `selection` para que la escritura siga con su ritmo natural.
  useEffect(() => {
    if (caretFijo === null) return;
    const id = requestAnimationFrame(() => setCaretFijo(null));
    return () => cancelAnimationFrame(id);
  }, [caretFijo]);

  function ejecutar(
    aplicar: (value: string, sel: SeleccionEditor) => ResultadoAccion,
  ) {
    if (!editable) return;
    const resultado = aplicar(value, seleccionRef.current);
    setCaretFijo({ start: resultado.inicio, end: resultado.fin });
    onChangeText(resultado.texto.slice(0, maxLength));
  }

  const conError = Boolean(error && error.length > 0);
  const agotado = value.length >= maxLength;

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.cabecera}>
        <ThemedText variant="bodySm" weight="medium">
          Cuerpo
        </ThemedText>
        <ThemedText
          variant="caption"
          tone="secondary"
          style={agotado ? estilos.contadorMax : null}>
          {`${value.length}/${maxLength}`}
        </ThemedText>
      </View>

      <View style={[estilos.panel, conError && estilos.panelError, enfocado && estilos.panelFocus]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          style={estilos.barra}>
          {GRUPOS_ACCIONES.map((grupo, i) => (
            <View key={i} style={estilos.grupoAcciones}>
              {i > 0 ? <View style={estilos.separador} /> : null}
              {grupo.map((accion) => (
                <Pressable
                  key={accion.id}
                  disabled={!editable}
                  accessibilityRole="button"
                  accessibilityLabel={accion.etiqueta}
                  onPress={() => ejecutar(accion.aplicar)}
                  onPressIn={() => setPresionado(accion.id)}
                  onPressOut={() => setPresionado(null)}
                  style={[
                    estilos.boton,
                    !editable && estilos.botonInhabilitado,
                    presionado === accion.id && estilos.botonPresionado,
                  ]}>
                  {accion.icono}
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
        <View style={estilos.divisorBarra} />

        <TextInput
          value={value}
          onChangeText={onChangeText}
          maxLength={maxLength}
          editable={editable}
          multiline
          textAlignVertical="top"
          placeholder={placeholder}
          placeholderTextColor={colors.text.secondary}
          selection={caretFijo ?? undefined}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          onSelectionChange={(e) => {
            seleccionRef.current = e.nativeEvent.selection;
          }}
          style={estilos.textarea}
        />
      </View>

      {conError ? (
        <ThemedText variant="caption" style={estilos.error}>
          {error}
        </ThemedText>
      ) : (
        <ThemedText variant="caption" tone="secondary">
          La barra escribe el formato por ti — no hace falta Markdown.
        </ThemedText>
      )}
    </View>
  );
}

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
  grupoAcciones: { flexDirection: 'row', alignItems: 'center' },
  separador: {
    width: 1,
    height: 20,
    backgroundColor: colors.border.subtle,
    marginHorizontal: spacing.xs,
  },
  boton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    marginHorizontal: 2,
  },
  botonPresionado: { backgroundColor: colors.bg.sunken },
  botonInhabilitado: { opacity: 0.4 },
  divisorBarra: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginHorizontal: spacing.md,
  },
  textarea: {
    color: colors.text.primary,
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 180,
  },
  error: { color: colors.status.danger },
});
