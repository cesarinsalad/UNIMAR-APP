import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

import { colors, fontFamily, radius, spacing } from './theme';
import { ThemedText } from './ThemedText';

export interface TextFieldProps extends Omit<TextInputProps, 'numberOfLines' | 'multiline'> {
  label?: string;
  hint?: string;
  error?: string;
  /* Slot a la derecha del input (ej. toggle de visibilidad). */
  rightElement?: React.ReactNode;
  containerStyle?: ViewStyle;
}

/** Campo de texto con label, hint y error, sobre superficie blanca. */
export function TextField({
  label,
  hint,
  error,
  rightElement,
  containerStyle,
  style,
  ...rest
}: TextFieldProps) {
  const [enfocado, setEnfocado] = useState(false);
  const conError = Boolean(error && error.length > 0);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <ThemedText variant="bodySm" weight="medium">
          {label}
        </ThemedText>
      ) : null}
      <View style={[styles.fila, conError && styles.filaError, enfocado && styles.filaFocus]}>
        <TextInput
          {...rest}
          onFocus={(e) => {
            setEnfocado(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setEnfocado(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={colors.text.secondary}
          style={[
            styles.input,
            Boolean(rightElement) && styles.inputConRight,
            style,
          ]}
        />
        {rightElement ? <View style={styles.right}>{rightElement}</View> : null}
      </View>
      {conError ? (
        <ThemedText variant="caption" style={styles.error}>
          {error}
        </ThemedText>
      ) : hint ? (
        <ThemedText variant="caption" tone="secondary">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  fila: {
    position: 'relative',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  filaError: { borderColor: colors.status.danger },
  filaFocus: { borderColor: colors.brand.primary },
  input: {
    color: colors.text.primary,
    fontFamily: fontFamily.regular,
    fontSize: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  inputConRight: { paddingRight: spacing.lg + 24 + spacing.xs },
  right: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  error: { color: colors.status.danger },
});
