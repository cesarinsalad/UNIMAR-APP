import { useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  CodeIcon,
  DotsThreeIcon,
  KeyboardIcon,
  LinkSimpleIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  TextBIcon,
  TextHOneIcon,
  TextHThreeIcon,
  TextHTwoIcon,
  TextIndentIcon,
  TextItalicIcon,
  TextOutdentIcon,
  TextStrikethroughIcon,
} from 'phosphor-react-native';

import { colors, radius, spacing, touchTarget } from '@/shared/ui/theme';

import type { ComandoEditor, EstadosComandos } from './comandosEditor';

interface Props {
  modo: 'visual' | 'markdown';
  estados: EstadosComandos;
  puedeDeshacer: boolean;
  puedeRehacer: boolean;
  editable: boolean;
  onDeshacer: () => void;
  onRehacer: () => void;
  onComando: (comando: ComandoEditor) => void;
  onOcultarTeclado: () => void;
  /** La web escribe Markdown directamente; no ofrece modo visual. */
  mostrarAlternarMarkdown?: boolean;
  style?: StyleProp<ViewStyle>;
}

const ICONO: Record<
  Exclude<ComandoEditor, 'alternarMarkdown'>,
  (color: string) => ReactNode
> = {
  negrita: (color) => <TextBIcon size={21} weight="bold" color={color} />,
  cursiva: (color) => <TextItalicIcon size={21} weight="bold" color={color} />,
  tachado: (color) => <TextStrikethroughIcon size={21} weight="bold" color={color} />,
  h1: (color) => <TextHOneIcon size={21} weight="bold" color={color} />,
  h2: (color) => <TextHTwoIcon size={21} weight="bold" color={color} />,
  h3: (color) => <TextHThreeIcon size={21} weight="bold" color={color} />,
  vinetas: (color) => <ListBulletsIcon size={21} weight="bold" color={color} />,
  numerada: (color) => <ListNumbersIcon size={21} weight="bold" color={color} />,
  indentar: (color) => <TextIndentIcon size={21} weight="bold" color={color} />,
  desindentar: (color) => <TextOutdentIcon size={21} weight="bold" color={color} />,
  enlace: (color) => <LinkSimpleIcon size={21} weight="bold" color={color} />,
};

const ETIQUETA: Record<ComandoEditor, string> = {
  negrita: 'Negrita',
  cursiva: 'Cursiva',
  tachado: 'Tachado',
  h1: 'Encabezado 1',
  h2: 'Encabezado 2',
  h3: 'Encabezado 3',
  vinetas: 'Lista con viñetas',
  numerada: 'Lista numerada',
  indentar: 'Aumentar sangría',
  desindentar: 'Disminuir sangría',
  enlace: 'Enlace',
  alternarMarkdown: 'Editar Markdown',
};

function Boton({
  etiqueta,
  activo = false,
  deshabilitado = false,
  onPress,
  children,
}: {
  etiqueta: string;
  activo?: boolean;
  deshabilitado?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ selected: activo, disabled: deshabilitado }}
      disabled={deshabilitado}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.boton,
        activo && estilos.botonActivo,
        deshabilitado && estilos.botonInactivo,
        pressed && !deshabilitado && estilos.botonPresionado,
      ]}>
      {children}
    </Pressable>
  );
}

function Icono({
  comando,
  activo,
}: {
  comando: Exclude<ComandoEditor, 'alternarMarkdown'>;
  activo: boolean;
}) {
  return (
    <View style={estilos.icono}>
      {ICONO[comando](activo ? colors.brand.primary : colors.text.primary)}
    </View>
  );
}

/**
 * Barra persistente del editor. Primera fila con las acciones de uso
 * continuo; segunda fila desplegable para comandos secundarios. El botón de
 * teclado queda fuera del scroll para no perderse en pantallas estrechas.
 */
export function BarraHerramientasEditor({
  modo,
  estados,
  puedeDeshacer,
  puedeRehacer,
  editable,
  onDeshacer,
  onRehacer,
  onComando,
  onOcultarTeclado,
  mostrarAlternarMarkdown = true,
  style,
}: Props) {
  const [masAbierto, setMasAbierto] = useState(false);

  function accion(comando: ComandoEditor) {
    if (!editable) return;
    onComando(comando);
  }

  return (
    <View style={[estilos.contenedor, style]}>
      {masAbierto ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={estilos.fila}>
          {(
            [
              'h1',
              'h3',
              'tachado',
              'numerada',
              'indentar',
              'desindentar',
            ] as const
          ).map((comando) => (
            <Boton
              key={comando}
              etiqueta={ETIQUETA[comando]}
              activo={estados[comando]}
              deshabilitado={!editable}
              onPress={() => accion(comando)}>
              <Icono comando={comando} activo={Boolean(estados[comando])} />
            </Boton>
          ))}
          {mostrarAlternarMarkdown ? (
            <>
              <View style={estilos.separador} />
              <Boton
                etiqueta={
                  modo === 'visual' ? 'Editar Markdown' : 'Volver a edición visual'
                }
                activo={modo === 'markdown'}
                deshabilitado={!editable}
                onPress={() => accion('alternarMarkdown')}>
                <CodeIcon
                  size={21}
                  weight="bold"
                  color={
                    modo === 'markdown'
                      ? colors.brand.primary
                      : colors.text.primary
                  }
                />
              </Boton>
            </>
          ) : null}
        </ScrollView>
      ) : null}

      <View style={estilos.filaPrincipal}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={estilos.fila}>
          <Boton
            etiqueta="Deshacer"
            deshabilitado={!editable || !puedeDeshacer}
            onPress={onDeshacer}>
            <ArrowCounterClockwiseIcon
              size={21}
              weight="bold"
              color={colors.text.primary}
            />
          </Boton>
          <Boton
            etiqueta="Rehacer"
            deshabilitado={!editable || !puedeRehacer}
            onPress={onRehacer}>
            <ArrowClockwiseIcon size={21} weight="bold" color={colors.text.primary} />
          </Boton>

          <View style={estilos.separador} />

          <Boton
            etiqueta={ETIQUETA.negrita}
            activo={estados.negrita}
            deshabilitado={!editable}
            onPress={() => accion('negrita')}>
            <Icono comando="negrita" activo={Boolean(estados.negrita)} />
          </Boton>
          <Boton
            etiqueta={ETIQUETA.cursiva}
            activo={estados.cursiva}
            deshabilitado={!editable}
            onPress={() => accion('cursiva')}>
            <Icono comando="cursiva" activo={Boolean(estados.cursiva)} />
          </Boton>
          <Boton
            etiqueta={ETIQUETA.h2}
            activo={estados.h2}
            deshabilitado={!editable}
            onPress={() => accion('h2')}>
            <Icono comando="h2" activo={Boolean(estados.h2)} />
          </Boton>
          <Boton
            etiqueta={ETIQUETA.vinetas}
            activo={estados.vinetas}
            deshabilitado={!editable}
            onPress={() => accion('vinetas')}>
            <Icono comando="vinetas" activo={Boolean(estados.vinetas)} />
          </Boton>

          <View style={estilos.separador} />

          <Boton
            etiqueta={ETIQUETA.enlace}
            activo={estados.enlace}
            deshabilitado={!editable}
            onPress={() => accion('enlace')}>
            <Icono comando="enlace" activo={Boolean(estados.enlace)} />
          </Boton>
          <Boton
            etiqueta={masAbierto ? 'Menos opciones de formato' : 'Más opciones de formato'}
            activo={masAbierto}
            deshabilitado={!editable}
            onPress={() => setMasAbierto((abierto) => !abierto)}>
            <DotsThreeIcon
              size={23}
              weight="bold"
              color={masAbierto ? colors.brand.primary : colors.text.primary}
            />
          </Boton>
        </ScrollView>

        <View style={estilos.divisorVertical} />
        <Boton etiqueta="Ocultar teclado" onPress={onOcultarTeclado}>
          <KeyboardIcon size={22} weight="bold" color={colors.text.primary} />
        </Boton>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    backgroundColor: colors.bg.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.strong,
    paddingBottom: spacing.xs,
  },
  filaPrincipal: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
  },
  fila: {
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    gap: 2,
  },
  boton: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonActivo: {
    backgroundColor: colors.brand.surfaceBlue,
  },
  botonPresionado: {
    backgroundColor: colors.bg.sunken,
  },
  botonInactivo: {
    opacity: 0.35,
  },
  icono: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  separador: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    backgroundColor: colors.border.subtle,
    marginHorizontal: spacing.xs,
  },
  divisorVertical: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: colors.border.subtle,
  },
});
