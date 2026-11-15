import { Image, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { CameraIcon, ImagesSquareIcon } from 'phosphor-react-native';

import { Chip } from '@/shared/ui/Chip';
import { ThemedButton } from '@/shared/ui/ThemedButton';
import { ThemedText } from '@/shared/ui/ThemedText';
import { ThemedView } from '@/shared/ui/ThemedView';
import { colors, radius, spacing, touchTarget } from '@/shared/ui/theme';

interface Decanato {
  id: number;
  nombre: string;
}

interface Props {
  portadaUri: string | null;
  onElegirPortada: (desdeCamara: boolean) => void;
  onQuitarPortada: () => void;
  seleccion: number[] | null;
  seleccionEfectiva: number[] | null;
  rol: 'ESTUDIANTE' | 'COMUNICADOR' | 'ADMIN';
  decanatoUsuario: number | null;
  decanatos: readonly Decanato[];
  onToggleGlobal: () => void;
  onToggleDecanato: (id: number) => void;
  errorAudiencia?: string | null;
  errorPortada?: string | null;
  titulo: string;
  cuerpoLength: number;
  editable: boolean;
}

/** Paso de configuración: portada y audiencia fuera del lienzo de escritura. */
export function PasoDetallesComunicado({
  portadaUri,
  onElegirPortada,
  onQuitarPortada,
  seleccion,
  seleccionEfectiva,
  rol,
  decanatoUsuario,
  decanatos,
  onToggleGlobal,
  onToggleDecanato,
  errorAudiencia,
  errorPortada,
  titulo,
  cuerpoLength,
  editable,
}: Props) {
  const resumenTitulo = titulo.trim().length > 0 ? titulo.trim() : 'Sin título';
  return (
    <ScrollView
      style={estilos.scroll}
      contentContainerStyle={estilos.contenido}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <ThemedView variant="sunken" style={estilos.resumen}>
        <ThemedText variant="caption" tone="secondary">
          Documento
        </ThemedText>
        <ThemedText variant="bodySm" weight="semibold" numberOfLines={2}>
          {resumenTitulo}
        </ThemedText>
        <ThemedText variant="caption" tone="secondary">
          {`${cuerpoLength.toLocaleString('es-VE')} caracteres`}
        </ThemedText>
      </ThemedView>

      <View style={estilos.seccion}>
        <View style={estilos.cabeceraSeccion}>
          <ThemedText variant="subtitle" weight="semibold">
            Portada
          </ThemedText>
          <ThemedText variant="caption" tone="secondary">
            Opcional · recorte 3:2
          </ThemedText>
        </View>

        {portadaUri ? (
          <View style={estilos.bloquePortada}>
            <Image source={{ uri: portadaUri }} style={estilos.portada} resizeMode="cover" />
            <View style={estilos.accionesPortada}>
              <ThemedButton
                title="Cambiar"
                variant="ghost"
                size="sm"
                disabled={!editable}
                onPress={() => onElegirPortada(false)}
              />
              {Platform.OS !== 'web' ? (
                <ThemedButton
                  title="Cámara"
                  variant="ghost"
                  size="sm"
                  disabled={!editable}
                  icon={<CameraIcon size={18} color={colors.brand.primary} />}
                  onPress={() => onElegirPortada(true)}
                />
              ) : null}
              <ThemedButton
                title="Quitar"
                variant="ghost"
                size="sm"
                disabled={!editable}
                onPress={onQuitarPortada}
              />
            </View>
          </View>
        ) : (
          <ThemedView variant="sunken" style={estilos.slotVacio}>
            <ImagesSquareIcon size={28} color={colors.brand.primary} />
            <ThemedText variant="bodySm" weight="semibold">
              Añadir una portada
            </ThemedText>
            <ThemedText variant="caption" tone="secondary" style={estilos.centrado}>
              Ayuda a que el comunicado destaque en el feed.
            </ThemedText>
            <View style={estilos.accionesPortada}>
              <ThemedButton
                title="Galería"
                variant="secondary"
                size="sm"
                disabled={!editable}
                onPress={() => onElegirPortada(false)}
              />
              {Platform.OS !== 'web' ? (
                <ThemedButton
                  title="Cámara"
                  variant="secondary"
                  size="sm"
                  disabled={!editable}
                  icon={<CameraIcon size={18} color={colors.brand.primary} />}
                  onPress={() => onElegirPortada(true)}
                />
              ) : null}
            </View>
          </ThemedView>
        )}
        {errorPortada ? (
          <ThemedText variant="caption" style={estilos.error}>
            {errorPortada}
          </ThemedText>
        ) : null}
      </View>

      <View style={estilos.separador} />

      <View style={estilos.seccion}>
        <View style={estilos.cabeceraSeccion}>
          <ThemedText variant="subtitle" weight="semibold">
            Audiencia
          </ThemedText>
          <ThemedText variant="caption" tone="secondary">
            Quién podrá leerlo
          </ThemedText>
        </View>

        {rol === 'COMUNICADOR' ? (
          <ThemedText variant="body" tone="secondary">
            Se publicará únicamente en tu decanato.
          </ThemedText>
        ) : rol === 'ADMIN' ? (
          <View style={estilos.audiencias}>
            <Chip
              etiqueta="Toda la universidad"
              activa={seleccionEfectiva?.length === 0}
              size="sm"
              role="checkbox"
              disabled={!editable}
              onPress={onToggleGlobal}
            />
            {decanatos.map((decanato) => (
              <Chip
                key={decanato.id}
                etiqueta={decanato.nombre}
                activa={Boolean(seleccionEfectiva?.includes(decanato.id))}
                size="sm"
                role="checkbox"
                disabled={!editable}
                onPress={() => onToggleDecanato(decanato.id)}
              />
            ))}
          </View>
        ) : (
          <ThemedText variant="body" tone="secondary">
            Tu cuenta no tiene permiso para publicar comunicados.
          </ThemedText>
        )}

        {rol === 'COMUNICADOR' && decanatoUsuario === null ? (
          <ThemedText variant="caption" style={estilos.error}>
            Tu cuenta no tiene decanato asignado; no puedes crear comunicados.
          </ThemedText>
        ) : null}
        {errorAudiencia ? (
          <ThemedText variant="caption" style={estilos.error}>
            {errorAudiencia}
          </ThemedText>
        ) : null}
        {rol === 'ADMIN' && seleccion === null ? (
          <ThemedText variant="caption" tone="secondary">
            Elige una audiencia para continuar.
          </ThemedText>
        ) : null}
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.surface },
  contenido: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  resumen: {
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 2,
  },
  seccion: {
    gap: spacing.md,
  },
  cabeceraSeccion: {
    gap: 2,
  },
  bloquePortada: {
    gap: spacing.sm,
  },
  portada: {
    width: '100%',
    aspectRatio: 3 / 2,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.surfaceBlue,
  },
  accionesPortada: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  slotVacio: {
    minHeight: touchTarget.min,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  centrado: {
    textAlign: 'center',
  },
  separador: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
  },
  audiencias: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  error: {
    color: colors.status.danger,
  },
});
