import { useEffect, useState } from 'react';
import { Modal, StyleSheet, TextInput, View } from 'react-native';

import { colors, radius, spacing } from '@/shared/ui';
import { ThemedButton, ThemedText, ThemedView } from '@/shared/ui';

export interface ModalRechazoProps {
  visible: boolean;
  /** Mutación en curso: congela textarea y botón, muestra carga. */
  cargando?: boolean;
  /** Error de la mutación: se muestra DENTRO; el modal no se cierra para
   * no perder el motivo escrito. Se limpia al cancelar o reintentar. */
  error?: string;
  onCancelar: () => void;
  /** Recibe el motivo ya recortado (trim); vacío no dispara confirmación.
   * Puede ser async: si la promesa falla el caller deja el modal abierto. */
  onConfirmar: (motivo: string) => void | Promise<void>;
}

/**
 * Modal de motivo del rechazo (ADMIN, PENDIENTE): textarea ≤ 500 con
 * botones Cancelar/Rechazar. El confirm se deshabilita con motivo vacío.
 * Compartido entre el detalle ([id].tsx) y la cola de revisión (mis.tsx).
 */
export function ModalRechazo({
  visible,
  cargando = false,
  error,
  onCancelar,
  onConfirmar,
}: ModalRechazoProps) {
  const [motivo, setMotivo] = useState('');

  // Cada apertura arranca con textarea vacío: rechazos consecutivos no
  // arrastran el motivo anterior por descuido.
  useEffect(() => {
    if (visible) setMotivo('');
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancelar}>
      <View style={estilos.fondo}>
        <ThemedView variant="card" accessibilityRole="alert" accessibilityLabel="Motivo del rechazo" style={estilos.tarjeta}>
          <ThemedText variant="subtitle" weight="semibold">
            Motivo del rechazo
          </ThemedText>
          <ThemedText variant="caption" tone="secondary">
            Se informará al autor vía notificación (COMUNICADO_RECHAZADO).
          </ThemedText>
          <TextInput
            value={motivo}
            onChangeText={setMotivo}
            multiline
            maxLength={500}
            textAlignVertical="top"
            style={[estilos.input, estilos.textarea]}
            placeholder="Explica por qué se devuelve al autor..."
            placeholderTextColor={colors.text.secondary}
            editable={!cargando}
          />
          {error ? (
            <ThemedText variant="caption" style={estilos.errorTexto}>
              {error}
            </ThemedText>
          ) : null}
          <View style={estilos.botones}>
            <ThemedButton
              title="Cancelar"
              variant="ghost"
              size="sm"
              onPress={onCancelar}
              disabled={cargando}
            />
            <ThemedButton
              title="Rechazar"
              size="sm"
              loading={cargando}
              disabled={motivo.trim().length === 0 || cargando}
              onPress={() => onConfirmar(motivo.trim())}
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
    padding: spacing.lg,
  },
  tarjeta: {
    width: '100%',
    maxWidth: 480,
    gap: spacing.sm,
  },
  botones: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: colors.bg.surface,
  },
  textarea: {
    minHeight: 96,
  },
  errorTexto: {
    color: colors.status.danger,
  },
});
