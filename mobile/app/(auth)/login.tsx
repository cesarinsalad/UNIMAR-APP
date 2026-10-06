import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Eye, EyeSlash } from 'phosphor-react-native';

import { Card, TextField, ThemedButton, ThemedText } from '@/shared/ui';
import { colors, radius, spacing } from '@/shared/ui';
import { login as loginApi } from '@/features/identidad/api/auth.api';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { ApiError } from '@/shared/api/axios';
import { tomarRutaPendiente } from '@/shared/notifications/pendingLink';
import LoginLogo from '../../assets/images/unimar/logo-vertical-color.png';

// El reseteo de contraseña se hace en la página web institucional, no en la app.
const URL_RESET_PASSWORD = 'https://www.unimar.edu.ve/login';

export default function LoginScreen() {
  const router = useRouter();
  const setSesion = useSesionStore((s) => s.setSesion);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
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
        <View style={styles.contenedor}>
          <Card elevationKey="lg" paddingH="lg" paddingV="md" style={styles.card}>
            {/* Sección 1: imagen */}
            <View style={[styles.seccionLogo, {paddingVertical: spacing.xl}]}>
              <Image
                source={LoginLogo}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Sección 2: textos */}
            <View style={[styles.seccionTextos, {paddingVertical: spacing.md}, {paddingBottom: spacing.xs}, {paddingHorizontal: spacing.lg}]}>
              <ThemedText variant="title" weight="bold" style={styles.titulo}>
                Bienvenido, unimarista!
              </ThemedText>
              <ThemedText variant="bodySm" tone="secondary" style={styles.subtitulo}>
                Ingresa tus credenciales para continuar
              </ThemedText>
            </View>

            {/* Sección 3: campos */}
            <View style={[styles.seccionCampos, {paddingVertical: spacing.md}, {paddingHorizontal: spacing.lg}]}>
              <TextField
                label="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="estudiante@unimar.edu.ve"
                editable={!cargando}
              />

              <TextField
                label="Contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!mostrarPassword}
                placeholder="••••••••"
                editable={!cargando}
                rightElement={
                  <Pressable onPress={() => setMostrarPassword((v) => !v)} hitSlop={8}>
                    {mostrarPassword ? (
                      <EyeSlash size={20} color={colors.text.secondary} />
                    ) : (
                      <Eye size={20} color={colors.text.secondary} />
                    )}
                  </Pressable>
                }
              />
            </View>

            {/* Sección 4: acción reset */}
            <View style={[styles.seccionReset, {paddingBottom: spacing.md}, {paddingHorizontal: spacing.lg}]}>
              <Pressable onPress={() => void Linking.openURL(URL_RESET_PASSWORD)} hitSlop={8}>
                <ThemedText variant="bodySm" weight="regular" style={styles.olvidaste}>
                  ¿Olvidaste tu contraseña?
                </ThemedText>
              </Pressable>
            </View>

            {/* Sección 5: acción principal */}
            <View style={[styles.seccionBoton, {paddingBottom: spacing.md}, {paddingHorizontal: spacing.lg}]}>
              {error ? (
                <View style={styles.errorBox}>
                  <ThemedText variant="bodySm" tone="onPrimary" style={styles.errorTexto}>
                    {error}
                  </ThemedText>
                </View>
              ) : null}
              <ThemedButton
                title="Iniciar Sesión"
                onPress={() => void onSubmit()}
                loading={cargando}
                size="lg"
              />
            </View>
          </Card>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.brand.primary },
  flex: { flex: 1 },
  contenedor: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  logoWrap: { alignItems: 'center', paddingBottom: spacing.xs },
  logo: { width: 120, height: 106 },
  card: {
    gap: spacing.md,
  },
  seccionLogo: {
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },
  seccionTextos: { gap: spacing.xs },
  seccionCampos: { gap: spacing.sm },
  seccionReset: { alignItems: 'flex-end' },
  seccionBoton: { gap: spacing.sm },
  titulo: { color: colors.brand.primary, textAlign: 'center' },
  subtitulo: { textAlign: 'center' },
  olvidaste: { color: colors.brand.primary },
  errorBox: {
    backgroundColor: colors.status.danger,
    padding: spacing.md,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  errorTexto: { textAlign: 'center' },
});
