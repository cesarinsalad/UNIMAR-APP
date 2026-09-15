import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors, layout, radius, spacing } from '@/shared/ui';
import { ThemedButton, ThemedText, ThemedView } from '@/shared/ui';
import { login as loginApi } from '@/features/identidad/api/auth.api';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { ApiError } from '@/shared/api/axios';
import { tomarRutaPendiente } from '@/shared/notifications/pendingLink';

export default function LoginScreen() {
  const router = useRouter();
  const setSesion = useSesionStore((s) => s.setSesion);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (!email || !password) {
      setError('Ingresa correo y contraseña.');
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const sesion = await loginApi(email.trim(), password);
      await setSesion(sesion.token);
      // Si el usuario tocó una notificación sin sesión, la cola vive hasta
      // este punto (get-and-clear: doble consumo imposible).
      router.replace((tomarRutaPendiente() ?? '/') as Parameters<typeof router.replace>[0]);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) {
          setError('Credenciales inválidas.');
        } else if (e.status >= 500) {
          setError('El servidor no responde. Intenta de nuevo en unos minutos.');
        } else {
          setError(e.message);
        }
      } else {
        setError('Error de red. Verifica tu conexión.');
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.hero}>
          <ThemedText variant="headline" weight="bold" tone="onPrimary">
            UNIMARapp
          </ThemedText>
          <ThemedText variant="body" tone="onPrimary">
            Universidad de Margarita
          </ThemedText>
        </View>

        <ThemedView variant="card" style={styles.card}>
          <ThemedText variant="title" weight="semibold">
            Iniciar sesión
          </ThemedText>

          <View style={styles.field}>
            <ThemedText variant="caption" tone="secondary">
              Correo institucional
            </ThemedText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="usuario@unimar.edu.ve"
              placeholderTextColor={colors.text.tertiary}
              style={styles.input}
              editable={!cargando}
            />
          </View>

          <View style={styles.field}>
            <ThemedText variant="caption" tone="secondary">
              Contraseña
            </ThemedText>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.text.tertiary}
              style={styles.input}
              editable={!cargando}
            />
          </View>

          {error ? (
            <ThemedText variant="caption" tone="onPrimary" style={styles.errorBox}>
              {error}
            </ThemedText>
          ) : null}

          <ThemedButton title="Entrar" onPress={onSubmit} loading={cargando} size="lg" />
        </ThemedView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  flex: { flex: 1 },
  hero: {
    paddingTop: spacing.twelve,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.eight,
    alignItems: 'flex-start',
    gap: spacing.one,
  },
  card: {
    margin: layout.screenPadding,
    marginTop: 0,
    gap: spacing.four,
  },
  field: {
    gap: spacing.two,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.three,
    paddingVertical: spacing.three,
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: colors.background.base,
  },
  errorBox: {
    backgroundColor: colors.status.danger,
    padding: spacing.three,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
});