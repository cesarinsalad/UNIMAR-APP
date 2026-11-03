import { Image, StyleSheet, View } from 'react-native';

import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { colors, spacing } from './theme';
import { ThemedButton } from './ThemedButton';
import { ThemedText } from './ThemedText';

import LogoVerticalBlanco from '../../../assets/images/unimar/logo-vertical-blanco.png';

/**
 * Vista de engobe web para quien NO es staff: la app completa es la
 * experiencia del teléfono; el navegador solo ofrece el apartado de
 * Gestión (staff). Se muestra EN LUGAR del árbol de rutas (el Stack ni
 * se monta) con un CTA de cierre de sesión — el estudiante no queda
 * enchufado sin forma de salir.
 */
export function VistaSoloMovil() {
  const logout = useSesionStore((s) => s.logout);

  return (
    <View style={estilos.raiz}>
      <Image source={LogoVerticalBlanco} style={estilos.logo} resizeMode="contain" />
      <ThemedText variant="title" weight="bold" style={estilos.titulo}>
        UNIMARapp es para tu teléfono
      </ThemedText>
      <ThemedText variant="body" style={estilos.texto}>
        La experiencia completa vive en la app móvil. Accede desde tu teléfono para ver tus clases, tareas y avisos.
      </ThemedText>
      <ThemedButton
        title="Cerrar sesión"
        variant="secondary"
        onPress={() => void logout()}
        style={estilos.boton}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: {
    flex: 1,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  logo: { width: 220, height: 195 },
  titulo: { color: colors.brand.onPrimary, textAlign: 'center' },
  texto: { color: colors.brand.onPrimary, textAlign: 'center', opacity: 0.85 },
  boton: { marginTop: spacing.lg },
});
