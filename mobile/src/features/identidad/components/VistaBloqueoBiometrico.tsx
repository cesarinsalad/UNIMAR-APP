import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FingerprintIcon } from 'phosphor-react-native';

import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { Card, ThemedButton, ThemedText, colors, radius, spacing } from '@/shared/ui';
import LoginLogo from '../../../../assets/images/unimar/logo-vertical-color.png';

type EstadoBloqueo = 'esperando' | 'cancelado';

/**
 * Compuerta de seguridad biométrica mostrada sobre el Stack principal cuando
 * la sesión protegida está bloqueada (arranque en frío o retorno desde segundo
 * plano). Impide montar pantallas autenticadas hasta verificar identidad.
 */
export function VistaBloqueoBiometrico() {
  const logout = useSesionStore((s) => s.logout);
  const [estado, setEstado] = useState<EstadoBloqueo>('esperando');
  const [verificando, setVerificando] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const montadoRef = useRef(true);
  const verificandoRef = useRef(false);

  const verificar = useCallback(async () => {
    if (verificandoRef.current) return;
    verificandoRef.current = true;
    if (montadoRef.current) {
      setVerificando(true);
      setEstado('esperando');
    }
    try {
      const res = await useSesionStore.getState().desbloquearConBiometria();
      if (!montadoRef.current) return;
      if (res === 'cancelado') {
        setEstado('cancelado');
      }
    } finally {
      verificandoRef.current = false;
      if (montadoRef.current) {
        setVerificando(false);
      }
    }
  }, []);

  useEffect(() => {
    montadoRef.current = true;
    const t = setTimeout(() => {
      void verificar();
    }, 150);
    return () => {
      montadoRef.current = false;
      clearTimeout(t);
    };
  }, [verificar]);

  async function usarContrasena() {
    if (verificandoRef.current || saliendo) return;
    setSaliendo(true);
    try {
      await logout();
    } catch {
      if (montadoRef.current) {
        setSaliendo(false);
      }
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.contenedor}>
        <Card elevationKey="lg" paddingH="lg" paddingV="md" style={styles.card}>
          <View style={styles.seccionLogo}>
            <Image source={LoginLogo} style={styles.logo} resizeMode="contain" />
          </View>

          <View style={styles.circuloBiometria}>
            <FingerprintIcon size={32} color={colors.brand.primary} weight="duotone" />
          </View>

          <View style={styles.seccionTextos}>
            <ThemedText variant="title" weight="bold" style={styles.titulo}>
              Seguridad biométrica
            </ThemedText>
            <ThemedText variant="bodySm" tone="secondary" style={styles.subtitulo}>
              Verifica tu identidad con tu huella o rostro para ingresar a UNIMARapp
            </ThemedText>
          </View>

          <View style={styles.seccionAcciones}>
            {estado === 'cancelado' ? (
              <View style={styles.avisoBox}>
                <ThemedText variant="bodySm" style={styles.avisoTexto}>
                  Verificación cancelada. Intenta nuevamente o ingresa con tus credenciales.
                </ThemedText>
              </View>
            ) : null}

            <ThemedButton
              title="Ingresar con biometría"
              size="lg"
              loading={verificando}
              disabled={saliendo}
              icon={<FingerprintIcon size={20} color={colors.text.onPrimary} weight="bold" />}
              onPress={() => void verificar()}
            />

            <ThemedButton
              title="Usar correo y contraseña"
              variant="ghost"
              size="md"
              loading={saliendo}
              disabled={verificando}
              onPress={() => void usarContrasena()}
            />
          </View>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.brand.primary },
  contenedor: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    gap: spacing.md,
  },
  seccionLogo: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  logo: { width: 120, height: 106 },
  circuloBiometria: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.surfaceBlue,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seccionTextos: {
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  titulo: { color: colors.brand.primary, textAlign: 'center' },
  subtitulo: { textAlign: 'center' },
  seccionAcciones: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  avisoBox: {
    backgroundColor: colors.brand.surfaceBlue,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  avisoTexto: {
    color: colors.brand.primary,
    textAlign: 'center',
  },
});
