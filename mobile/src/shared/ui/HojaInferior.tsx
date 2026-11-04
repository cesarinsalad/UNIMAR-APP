import { Modal, Pressable, ScrollView, StyleSheet } from 'react-native';

import { colors, radius, spacing, layout } from './theme';

export interface HojaOpener {
  /** Cierra la hoja de inmediato (web: alterna estado del Modal). */
  cerrar: () => void;
}

export interface HojaInferiorProps {
  /** true presenta la hoja; false la oculta (API declarativa). */
  abierto: boolean;
  /** Llamado CUANDO la salida ya terminó (después de la animación): la
   *  pantalla limpia su estado (o descubre el fondo, en el anfitrión). */
  onCerrar: () => void;
  /** Render prop: los contenidos reciben `cerrar` para despedir por
   *  cuenta propia (botón X, éxito de una mutación) sin pelear con el
   *  estado de la pantalla que la montó. */
  children?: (hoja: HojaOpener) => React.ReactNode;
}

/**
 * Hoja inferior genérica del sistema, VARIANTE WEB: Modal slide de RN core
 * (el patrón ya probado de Select.tsx) con hoja bottom redondeada, cortina
 * dim PRESS-para-cerrar y Android back. Contenido largo scrollea con techo.
 * La variante NATIVA (TrueSheet de @lodev09/react-native-true-sheet) vive
 * en HojaInferior.native.tsx — aquí no se importa true-sheet para que el
 * bundle web no cargue su implementación de escritorio (radix/vaul) que la
 * web no usa. Toda referencia a librerías queda dentro del respectivo
 * archivo-platforma: las pantallas solo hablan abierto/onCerrar/cerrar.
 */
export function HojaInferior({ abierto, onCerrar, children }: HojaInferiorProps) {
  return (
    <Modal transparent visible={abierto} animationType="slide" onRequestClose={onCerrar}>
      <Pressable accessibilityLabel="Cerrar hoja" style={estilos.cortina} onPress={onCerrar}>
        <Pressable style={estilos.hoja}>
          <ScrollView
            style={estilos.scroll}
            contentContainerStyle={estilos.contenido}
            showsVerticalScrollIndicator={false}>
            {children?.({ cerrar: onCerrar })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  cortina: {
    flex: 1,
    backgroundColor: `${colors.bg.canvas}E6`,
    justifyContent: 'flex-end',
  },
  hoja: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  scroll: {
    maxHeight: '85%',
  },
  /** Solo padding: el RITMO (rhythm) lo aporta el contenido con sus propios
   *  gaps (misma regla de la variante native) — así cabecera, secciones y
   *  cluster de acciones respiran idéntico en ambos dispositivos según
   *  STYLE.md §3. */
  contenido: {
    padding: spacing.lg,
  },
});
