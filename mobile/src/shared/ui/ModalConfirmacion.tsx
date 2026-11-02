import { Modal, StyleSheet, View } from 'react-native';

import { colors, spacing } from './theme';
import { ThemedButton } from './ThemedButton';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

export interface ModalConfirmacionProps {
  visible: boolean;
  titulo: string;
  mensaje: string;
  /** Texto del botón de confirmación. Default 'Confirmar'. */
  textoConfirmar?: string;
  /** Texto del botón de cancelación. Default 'Cancelar'. */
  textoCancelar?: string;
  /** Estiliza título y botón de confirmación en rojo (acción destructiva). */
  destructive?: boolean;
  /** Pone el botón de confirmación en estado de carga. */
  cargando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/**
 * Diálogo de confirmación multiplataforma. `Alert.alert` de RN core es
 * no-op en web (react-native-web lo implementa vacío): este componente
 * reemplaza ese patrón con un `Modal` de RN core, igual al modal de
 * rechazo del detalle de comunicados, que sí funciona en todas las
 * plataformas.
 */
export function ModalConfirmacion({
  visible,
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  destructive = false,
  cargando = false,
  onConfirmar,
  onCancelar,
}: ModalConfirmacionProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancelar}>
      <View style={estilos.fondo}>
        <ThemedView
          variant="card"
          accessibilityRole="alert"
          accessibilityLabel={titulo}
          style={estilos.tarjeta}>
          <ThemedText
            variant="subtitle"
            weight="semibold"
            style={destructive ? estilos.tituloDestructivo : undefined}>
            {titulo}
          </ThemedText>
          <ThemedText variant="body" tone="secondary">
            {mensaje}
          </ThemedText>
          <View style={estilos.botones}>
            <ThemedButton
              title={textoCancelar}
              variant="ghost"
              size="sm"
              onPress={onCancelar}
              disabled={cargando}
            />
            <ThemedButton
              title={textoConfirmar}
              size="sm"
              loading={cargando}
              disabled={cargando}
              onPress={onConfirmar}
              style={destructive ? estilos.botonDestructivo : undefined}
            />
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.four,
  },
  tarjeta: {
    width: '100%',
    maxWidth: 480,
    gap: spacing.two,
  },
  botones: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.two,
    marginTop: spacing.one,
  },
  tituloDestructivo: {
    color: colors.status.danger,
  },
  // El label de la variante primary es blanco (onPrimary): basta con
  // teñir el contenedor; el texto hereda el contraste correcto.
  botonDestructivo: {
    backgroundColor: colors.status.danger,
  },
});
