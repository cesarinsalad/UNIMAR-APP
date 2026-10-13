import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BellIcon,
  BookBookmarkIcon,
  CaretRightIcon,
  QrCodeIcon,
  SignOutIcon,
} from 'phosphor-react-native';

import { api } from '@/shared/api/axios';
import { aRomano, etiquetaEstatus, formatoCedula } from '@/features/identidad/carnet-helpers';
import { useRegistrarDispositivo } from '@/features/notificaciones/hooks/useRegistrarDispositivo';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { usePerfil } from '@/features/academico/hooks/usePerfil';
import { CarnetDigital, inicialesDe } from '@/features/identidad/components/CarnetDigital';
import { colors, layout, radius, spacing } from '@/shared/ui';
import { HeaderTab, PressableScale, ThemedText, ThemedView } from '@/shared/ui';
import { CampanaConBadge } from '@/features/notificaciones/components/CampanaConBadge';
import { useNoLeidas } from '@/features/notificaciones/hooks/useNoLeidas';

type PerfilAcademicoQuery = ReturnType<typeof usePerfil>;

/** Tab Perfil: identidad + carnet digital (estético) + pensum + ajustes. */
export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const noLeidas = useNoLeidas();
  const perfil = usePerfil();
  const [carnetAbierto, setCarnetAbierto] = useState(false);

  return (
    <ThemedView variant="base" style={estilos.pantalla}>
      <ScrollView
        contentContainerStyle={[
          estilos.scroll,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: insets.bottom + layout.bottomTabInset,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <HeaderTab
          titulo="Perfil"
          action={<CampanaConBadge total={noLeidas.data?.total ?? 0} tono="claro" />}
        />

        <TarjetaIdentidad abreCarnet={() => setCarnetAbierto(true)} perfil={perfil} />
        <TarjetaPensum />
        <TarjetaAjustes />
        <TarjetaCerrarSesion />
      </ScrollView>

      <CarnetDigital
        visible={carnetAbierto}
        onClose={() => setCarnetAbierto(false)}
        datos={
          perfil.data
            ? {
                nombre: perfil.data.nombre,
                carrera: perfil.data.carrera,
                cedula: perfil.data.cedula,
                semestre: perfil.data.semestre,
                estatus: perfil.data.estatus,
              }
            : null
        }
      />
    </ThemedView>
  );
}

/** Tarjeta superior: avatar + nombre + carrera + cédula + estatus + carnet. */
function TarjetaIdentidad({
  abreCarnet,
  perfil,
}: {
  abreCarnet: () => void;
  perfil: PerfilAcademicoQuery;
}) {
  const usuario = useSesionStore((s) => s.usuario);

  const iniciales = useMemo(() => inicialesDe(usuario?.nombre ?? ''), [usuario?.nombre]);
  const nombre = usuario?.nombre ?? 'Sin sesión';
  const carrera = perfil.data?.carrera ?? null;
  const cedulaFormateada = perfil.data ? formatoCedula(perfil.data.cedula) : null;

  return (
    <ThemedView variant="card" style={estilos.tarjetaIdentidad}>
      <View style={estilos.fileRule} />
      <View style={estilos.filaIdentidad}>
        <View style={estilos.avatar}>
          <ThemedText variant="title" weight="semibold" style={estilos.avatarTexto}>
            {iniciales || '?'}
          </ThemedText>
        </View>
        <View style={estilos.identidad}>
          <ThemedText variant="title" weight="semibold" numberOfLines={2}>
            {nombre}
          </ThemedText>
          {carrera ? (
            <ThemedText variant="body" tone="secondary" numberOfLines={2}>
              {carrera}
            </ThemedText>
          ) : null}
          {cedulaFormateada ? (
            <ThemedText variant="caption" tone="tertiary">
              {cedulaFormateada}
            </ThemedText>
          ) : perfil.isPending ? (
            <ActivityIndicator color={colors.brand.primary} style={estilos.cargandoPerfil} />
          ) : null}
        </View>
      </View>

      {pillEstatus(perfil.data?.estatus, perfil.data?.semestre) ? (
        <ThemedView style={estilos.pill}>
          <ThemedText variant="caption" weight="medium" style={estilos.pillTexto}>
            {pillEstatus(perfil.data?.estatus, perfil.data?.semestre)}
          </ThemedText>
        </ThemedView>
      ) : null}

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Ver carnet digital"
        style={estilos.botonCarnet}
        onPress={abreCarnet}>
        <QrCodeIcon size={18} color={colors.brand.primary} weight="bold" />
        <ThemedText variant="bodySm" weight="semibold" style={estilos.botonCarnetTexto}>
          Ver Carnet Digital
        </ThemedText>
      </PressableScale>
    </ThemedView>
  );
}

/** Pill "Estudiante Regular · Trimestre IX" solo con el perfil cargado. */
function pillEstatus(estatus: string | undefined, semestre: number | undefined): string | null {
  if (!estatus) return null;
  const periodo = semestre !== undefined ? ` · Trimestre ${aRomano(semestre)}` : '';
  return `${etiquetaEstatus(estatus)}${periodo}`;
}

/** Fila "Pensúm Académico" → /academico/pensum (solo estudiante). */
function TarjetaPensum() {
  const usuario = useSesionStore((s) => s.usuario);
  if (usuario?.rol !== 'ESTUDIANTE') return null;

  return (
    <ThemedView variant="card" style={estilos.tarjetaFilas}>
      <FilaIcono
        titulo="Pensúm Académico"
        icono={
          <BookBookmarkIcon size={20} color={colors.brand.primary} weight="duotone" />
        }
        onPress={() => router.push('/academico/pensum')}
      />
    </ThemedView>
  );
}

/** Fila "Notificaciones Push": off = baja el dispositivo del BFF; on = re-registra. */
function TarjetaAjustes() {
  const usuario = useSesionStore((s) => s.usuario);
  const dispositivoId = useSesionStore((s) => s.dispositivoId);
  const pushDeshabilitado = useSesionStore((s) => s.pushDeshabilitado);
  const { registrar } = useRegistrarDispositivo();

  const [huboError, setHuboError] = useState(false);

  const activado = !pushDeshabilitado;

  async function cambiarPush(nuevoValor: boolean) {
    setHuboError(false);
    if (!nuevoValor) {
      if (dispositivoId) {
        try {
          await api.delete(`/dispositivos/${dispositivoId}`);
        } catch {
          // best-effort: el flag local evita que se vuelva a registrar
        }
      }
      useSesionStore.getState().setDispositivo(null);
      useSesionStore.getState().setPushDeshabilitado(true);
    } else {
      const estado = await registrar();
      if (estado !== 'ok') setHuboError(true);
    }
  }

  if (Platform.OS === 'web') return null;

  return (
    <ThemedView variant="card" style={estilos.tarjetaFilas}>
      <View style={estilos.fila}>
        <View style={estilos.leading}>
          <BellIcon size={20} color={colors.brand.primary} weight="duotone" />
        </View>
        <View style={estilos.textoFila}>
          <ThemedText variant="body" weight="medium">
            Notificaciones Push
          </ThemedText>
          {huboError ? (
            <ThemedText variant="caption" tone="tertiary">
              No se pudo activar (revisa permisos e Internet)
            </ThemedText>
          ) : null}
        </View>
        <Switch
          value={activado}
          onValueChange={(v) => {
            void cambiarPush(v);
          }}
          trackColor={{ true: colors.brand.primary as string, false: colors.border.subtle }}
          disabled={usuario === null}
        />
      </View>
    </ThemedView>
  );
}

/** Cerrar sesión con confirmación. */
function TarjetaCerrarSesion() {
  const logout = useSesionStore((s) => s.logout);

  const confirmar = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir de UNIMARapp?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: () => {
          void logout();
        },
      },
    ]);
  };

  return (
    <ThemedView variant="card" style={estilos.tarjetaFilas}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión"
        style={estilos.filaSalir}
        onPress={confirmar}>
        <SignOutIcon size={20} color={colors.status.danger} weight="bold" />
        <ThemedText variant="body" weight="semibold" style={estilos.salirTexto}>
          Cerrar Sesión
        </ThemedText>
      </PressableScale>
    </ThemedView>
  );
}

/** Fila de configuración reutilizable con icono tintado + chevron. */
function FilaIcono({
  titulo,
  icono,
  onPress,
}: {
  titulo: string;
  icono: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={titulo}
      style={estilos.fila}
      onPress={onPress}>
      <View style={estilos.leading}>{icono}</View>
      <ThemedText variant="body" weight="medium" style={estilos.textoFila}>
        {titulo}
      </ThemedText>
      <CaretRightIcon size={18} color={colors.text.secondary} />
    </PressableScale>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  fileRule: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.brand.primary,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
  },
  scroll: {
    paddingVertical: spacing.md,
    paddingHorizontal: layout.screenPadding,
    gap: spacing.lg,
  },
  tarjetaIdentidad: { gap: spacing.md, overflow: 'hidden' },
  filaIdentidad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { color: colors.text.onPrimary },
  identidad: {
    flex: 1,
    gap: 2,
  },
  cargandoPerfil: { marginTop: spacing.xs },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brand.surfaceBlue,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pillTexto: { color: colors.brand.primary },
  botonCarnet: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  botonCarnetTexto: { color: colors.brand.primary },
  tarjetaFilas: { paddingVertical: spacing.xs },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  leading: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.brand.surfaceBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoFila: { flex: 1 },
  filaSalir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  salirTexto: { color: colors.status.danger },
});
