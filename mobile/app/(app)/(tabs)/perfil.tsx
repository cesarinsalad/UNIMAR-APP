import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BellIcon,
  BookBookmarkIcon,
  CaretRightIcon,
  FingerprintIcon,
  QrCodeIcon,
  SignOutIcon,
  SquaresFourIcon,
} from 'phosphor-react-native';

import { api } from '@/shared/api/axios';
import { aRomano, etiquetaEstatus, formatoCedula } from '@/features/identidad/carnet-helpers';
import { usePermisos } from '@/features/identidad/hooks/usePermisos';
import { useRegistrarDispositivo } from '@/features/notificaciones/hooks/useRegistrarDispositivo';
import {
  useSesionStore,
  type MotivoErrorBiometria,
} from '@/features/identidad/store/sesion.store';
import { usePerfil } from '@/features/academico/hooks/usePerfil';
import { CarnetDigital, inicialesDe } from '@/features/identidad/components/CarnetDigital';
import { colors, elevation, layout, radius, spacing } from '@/shared/ui';
import {
  Card,
  HeaderTab,
  ModalConfirmacion,
  PressableScale,
  SectionHeader,
  SeparadorFino,
  ThemedText,
  ThemedView,
} from '@/shared/ui';

type PerfilAcademicoQuery = ReturnType<typeof usePerfil>;

/** Tab Perfil: identidad + carnet digital (estético) + pensum + ajustes. */
export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const perfil = usePerfil();
  const [carnetAbierto, setCarnetAbierto] = useState(false);

  return (
    <ThemedView variant="base" style={estilos.pantalla}>
      <ScrollView
        contentContainerStyle={[
          estilos.scroll,
          {
            paddingTop: spacing.lg,
            paddingBottom: insets.bottom + layout.bottomTabInset,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <HeaderTab
          titulo="Perfil"
        />

        <TarjetaIdentidad abreCarnet={() => setCarnetAbierto(true)} perfil={perfil} />
        <TarjetaAccesos />
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

/** Portada de identidad: la misma voz azul de la tarjeta estrella de Inicio. */
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
  const estatus = perfil.data?.estatus;
  const semestre = perfil.data?.semestre;

  return (
    <ThemedView style={estilos.tarjetaIdentidad}>
      {estatus || semestre !== undefined ? (
        <View style={estilos.resumenSuperior}>
          {estatus ? (
            <ThemedView style={estilos.pill}>
              <ThemedText variant="caption" weight="semibold" style={estilos.pillTexto}>
                {etiquetaEstatus(estatus)}
              </ThemedText>
            </ThemedView>
          ) : null}
          {semestre !== undefined ? (
            <ThemedText variant="caption" weight="semibold" tone="onPrimary">
              Trimestre {aRomano(semestre)}
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      <View style={estilos.filaIdentidad}>
        <View style={estilos.avatar}>
          <ThemedText variant="headline" weight="semibold" style={estilos.avatarTexto}>
            {iniciales || '?'}
          </ThemedText>
        </View>
        <View style={estilos.identidad}>
          <ThemedText variant="title" weight="bold" tone="onPrimary" numberOfLines={2}>
            {nombre}
          </ThemedText>
          {carrera ? (
            <ThemedText
              variant="bodySm"
              tone="onPrimary"
              numberOfLines={2}
              style={estilos.textoHeroSecundario}>
              {carrera}
            </ThemedText>
          ) : null}
          {cedulaFormateada ? (
            <ThemedText variant="caption" tone="onPrimary" style={estilos.textoHeroSecundario}>
              {cedulaFormateada}
            </ThemedText>
          ) : perfil.isPending ? (
            <ActivityIndicator color={colors.text.onPrimary} style={estilos.cargandoPerfil} />
          ) : perfil.isError ? (
            <ThemedText variant="caption" tone="onPrimary" style={estilos.textoHeroSecundario}>
              No se pudo cargar el perfil académico
            </ThemedText>
          ) : null}
        </View>
      </View>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Ver carnet digital"
        style={estilos.botonCarnet}
        onPress={abreCarnet}>
        <QrCodeIcon size={20} color={colors.brand.primary} weight="bold" />
        <ThemedText variant="bodySm" weight="semibold" style={estilos.botonCarnetTexto}>
          Ver carnet digital
        </ThemedText>
      </PressableScale>
    </ThemedView>
  );
}

/** Accesos según rol: pénsum para estudiantes y consola para el staff. */
function TarjetaAccesos() {
  const usuario = useSesionStore((s) => s.usuario);
  const permisos = usePermisos();
  const esEstudiante = usuario?.rol === 'ESTUDIANTE';

  if (!esEstudiante && !permisos.puedeCrearComunicado) return null;

  return (
    <View style={estilos.seccion}>
      <SectionHeader title="Accesos" />
      <Card padding="zero" paddingV="xs">
        {esEstudiante ? (
          <FilaIcono
            titulo="Pensum académico"
            descripcion="Materias y prerrequisitos de tu carrera"
            icono={<BookBookmarkIcon size={20} color={colors.brand.primary} weight="duotone" />}
            onPress={() => router.push('/academico/pensum')}
          />
        ) : null}
        {esEstudiante && permisos.puedeCrearComunicado ? <SeparadorFino /> : null}
        {permisos.puedeCrearComunicado ? (
          <FilaIcono
            titulo="Panel de gestión"
            descripcion="Comunicados y eventos institucionales"
            icono={<SquaresFourIcon size={20} color={colors.brand.primary} weight="duotone" />}
            onPress={() => router.push('/gestion' as never)}
          />
        ) : null}
      </Card>
    </View>
  );
}

function subtituloBiometria(motivo: MotivoErrorBiometria | null): string {
  switch (motivo) {
    case 'no_disponible':
      return 'Configura huella o rostro en los ajustes de tu dispositivo';
    case 'cancelado':
      return 'Verificación cancelada. No se activó el bloqueo';
    case 'error':
      return 'No se pudo guardar la configuración biométrica';
    default:
      return 'Solicitar huella o rostro al abrir la app';
  }
}

/** Ajustes nativos: notificaciones push e ingreso biométrico al abrir la app. */
function TarjetaAjustes() {
  const usuario = useSesionStore((s) => s.usuario);
  const dispositivoId = useSesionStore((s) => s.dispositivoId);
  const pushDeshabilitado = useSesionStore((s) => s.pushDeshabilitado);
  const biometriaActiva = useSesionStore((s) => s.biometriaActiva);
  const { registrar } = useRegistrarDispositivo();

  const [huboError, setHuboError] = useState(false);
  const [cambiandoBiometria, setCambiandoBiometria] = useState(false);
  const [errorBiometria, setErrorBiometria] = useState<MotivoErrorBiometria | null>(null);

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

  async function cambiarBiometria(nuevoValor: boolean) {
    setErrorBiometria(null);
    setCambiandoBiometria(true);
    try {
      if (nuevoValor) {
        const res = await useSesionStore.getState().activarBiometria();
        if (!res.ok) setErrorBiometria(res.motivo);
      } else {
        await useSesionStore.getState().desactivarBiometria();
      }
    } finally {
      setCambiandoBiometria(false);
    }
  }

  if (Platform.OS === 'web') return null;

  return (
    <View style={estilos.seccion}>
      <SectionHeader title="Preferencias" />
      <Card padding="zero" paddingV="xs">
        <View style={estilos.fila}>
          <View style={estilos.leading}>
            <BellIcon size={20} color={colors.brand.primary} weight="duotone" />
          </View>
          <View style={estilos.textoFila}>
            <ThemedText variant="body" weight="medium">
              Notificaciones push
            </ThemedText>
            <ThemedText
              variant="caption"
              tone="tertiary"
              style={huboError ? estilos.errorFila : undefined}>
              {huboError
                ? 'No se pudo activar (revisa permisos e Internet)'
                : 'Recibe avisos en este dispositivo'}
            </ThemedText>
          </View>
          <Switch
            accessibilityLabel="Notificaciones push"
            value={activado}
            onValueChange={(v) => {
              void cambiarPush(v);
            }}
            trackColor={{
              true: colors.brand.primary as string,
              false: colors.border.subtle,
            }}
            disabled={usuario === null}
          />
        </View>

        <SeparadorFino />

        <View style={estilos.fila}>
          <View style={estilos.leading}>
            <FingerprintIcon size={20} color={colors.brand.primary} weight="duotone" />
          </View>
          <View style={estilos.textoFila}>
            <ThemedText variant="body" weight="medium">
              Ingreso biométrico
            </ThemedText>
            <ThemedText
              variant="caption"
              tone="tertiary"
              style={errorBiometria ? estilos.errorFila : undefined}>
              {subtituloBiometria(errorBiometria)}
            </ThemedText>
          </View>
          <Switch
            accessibilityLabel="Ingreso biométrico"
            value={biometriaActiva}
            onValueChange={(v) => {
              void cambiarBiometria(v);
            }}
            trackColor={{
              true: colors.brand.primary as string,
              false: colors.border.subtle,
            }}
            disabled={usuario === null || cambiandoBiometria}
          />
        </View>
      </Card>
    </View>
  );
}

/** Cerrar sesión con confirmación. */
function TarjetaCerrarSesion() {
  const logout = useSesionStore((s) => s.logout);
  const [confirmar, setConfirmar] = useState(false);

  return (
    <>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión"
        style={estilos.filaSalir}
        onPress={() => setConfirmar(true)}>
        <SignOutIcon size={20} color={colors.status.danger} weight="bold" />
        <ThemedText variant="bodySm" weight="semibold" style={estilos.salirTexto}>
          Cerrar sesión
        </ThemedText>
      </PressableScale>
      <ModalConfirmacion
        visible={confirmar}
        titulo="Cerrar sesión"
        mensaje="¿Seguro que quieres salir de UNIMARapp?"
        textoConfirmar="Cerrar sesión"
        destructive
        onConfirmar={() => {
          setConfirmar(false);
          void logout();
        }}
        onCancelar={() => setConfirmar(false)}
      />
    </>
  );
}

/** Fila de configuración reutilizable con icono tintado + chevron. */
function FilaIcono({
  titulo,
  descripcion,
  icono,
  onPress,
}: {
  titulo: string;
  descripcion: string;
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
      <View style={estilos.textoFila}>
        <ThemedText variant="body" weight="medium">
          {titulo}
        </ThemedText>
        <ThemedText variant="caption" tone="tertiary">
          {descripcion}
        </ThemedText>
      </View>
      <CaretRightIcon size={18} color={colors.text.secondary} />
    </PressableScale>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  scroll: {
    paddingVertical: spacing.md,
    paddingHorizontal: layout.screenPadding,
    gap: spacing.xl,
  },
  seccion: { gap: spacing.md },
  tarjetaIdentidad: {
    backgroundColor: colors.brand.primary,
    borderRadius: radius.card,
    ...elevation.md,
    padding: spacing.lg,
    gap: spacing.xl,
  },
  resumenSuperior: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  filaIdentidad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { color: colors.brand.primary },
  identidad: {
    flex: 1,
    gap: 2,
  },
  textoHeroSecundario: { opacity: 0.84 },
  cargandoPerfil: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pillTexto: { color: colors.brand.primary },
  botonCarnet: {
    minHeight: 48,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.button,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  botonCarnetTexto: { color: colors.brand.primary },
  fila: {
    minHeight: 64,
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
  errorFila: { color: colors.status.danger },
  filaSalir: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  salirTexto: { color: colors.status.danger },
});
