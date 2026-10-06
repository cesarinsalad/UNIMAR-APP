import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from './theme';
import { ThemedText } from './ThemedText';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

/** Campo de texto con label, hint y error, sobre superficie blanca. */
export function TextField({ label, hint, error, containerStyle, style, ...rest }: TextFieldProps) {
  const [enfocado, setEnfocado] = useState(false);
  const conError = Boolean(error && error.length > 0);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <ThemedText variant="bodySm" weight="medium">
          {label}
        </ThemedText>
      ) : null}
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
        style={[styles.input, conError && styles.inputError, enfocado && styles.inputFocus, style]}
      />
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
  input: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    color: colors.text.primary,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  inputError: { borderColor: colors.status.danger },
  inputFocus: { borderColor: colors.brand.primary },
  error: { color: colors.status.danger },
});
