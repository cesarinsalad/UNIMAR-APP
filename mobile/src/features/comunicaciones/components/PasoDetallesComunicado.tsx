import { Image, Platform, ScrollView, StyleSheet, View } from 'react-native';
import {
  CameraIcon,
  ImagesSquareIcon,
  LockSimpleIcon,
} from 'phosphor-react-native';

import { Card } from '@/shared/ui/Card';
import { Skeleton, SkeletonGroup } from '@/shared/ui/Skeleton';
import { ThemedButton } from '@/shared/ui/ThemedButton';
import { ThemedText } from '@/shared/ui/ThemedText';
import { colors, layout, radius, spacing } from '@/shared/ui/theme';

import { SeccionAdjuntosPaso, type ArchivoAdjuntoCola } from './SeccionAdjuntosPaso';
import { SelectorAudiencia } from './SelectorAudiencia';
import { fuenteImagen, type ArchivoAdjunto } from '../api/adjuntos.api';
import type { Adjunto } from '../types';

interface Decanato {
  id: number;
  nombre: string;
}

interface Props {
  portadaUri: string | null;
  onElegirPortada: (desdeCamara: boolean) => void;
  onQuitarPortada: () => void;
  errorPortada?: string | null;
  /** true mientras se firma la URL de una portada ya guardada (edición). */
  cargandoPortada?: boolean;

  seleccion: number[] | null;
  seleccionEfectiva: number[] | null;
  rol: 'ESTUDIANTE' | 'COMUNICADOR' | 'ADMIN';
  decanatoUsuario: number | null;
  decanatos: readonly Decanato[];
  onCambiarAudiencia: (seleccion: number[]) => void;
  errorAudiencia?: string | null;

  adjuntosExistentes: readonly Adjunto[];
  adjuntosNuevos: readonly ArchivoAdjuntoCola[];
  adjuntosPorEliminar: readonly Adjunto[];
  cargandoAdjuntos?: boolean;
  portadaPath?: string | null;
  onAgregarAdjuntos: (archivos: ArchivoAdjunto[]) => void;
  onQuitarAdjuntoNuevo: (clave: string) => void;
  onMarcarAdjuntoExistente: (adjunto: Adjunto) => void;
  onDesmarcarAdjuntoExistente: (id: string) => void;
  errorAdjuntos?: string | null;

  editable: boolean;
}

/**
 * Paso de configuración: portada, audiencia y adjuntos fuera del lienzo
 * de escritura. La piel es tarjetas blancas sobre el lienzo gris cálido
 * (STYLE.md §4): la portada vacía respira en brand/surface-blue con borde
 * punteado, en lugar de un bloque gris plano.
 */
export function PasoDetallesComunicado({
  portadaUri,
  onElegirPortada,
  onQuitarPortada,
  errorPortada,
  cargandoPortada = false,
  seleccion,
  seleccionEfectiva,
  rol,
  decanatoUsuario,
  decanatos,
  onCambiarAudiencia,
  errorAudiencia,
  adjuntosExistentes,
  adjuntosNuevos,
  adjuntosPorEliminar,
  cargandoAdjuntos = false,
  portadaPath,
  onAgregarAdjuntos,
  onQuitarAdjuntoNuevo,
  onMarcarAdjuntoExistente,
  onDesmarcarAdjuntoExistente,
  errorAdjuntos,
  editable,
}: Props) {
  const decanatoUsuarioNombre =
    decanatos.find((decanato) => decanato.id === decanatoUsuario)?.nombre ?? null;

  return (
    <ScrollView
      style={estilos.scroll}
      contentContainerStyle={estilos.contenido}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>

      <Card padding="md" style={estilos.tarjeta}>
        <View style={estilos.cabeceraTarjeta}>
          <ThemedText variant="subtitle" weight="semibold">
            Portada
          </ThemedText>
          <ThemedText variant="caption" tone="secondary">
            Opcional · recorte 3:2
          </ThemedText>
        </View>

        {portadaUri ? (
          <View style={estilos.bloquePortada}>
            <Image source={fuenteImagen(portadaUri)} style={estilos.portada} resizeMode="cover" />
            <View style={estilos.accionesPortada}>
              <ThemedButton
                title="Cambiar"
                variant="tonal"
                size="sm"
                disabled={!editable}
                onPress={() => onElegirPortada(false)}
              />
              {Platform.OS !== 'web' ? (
                <ThemedButton
                  title="Cámara"
                  variant="tonal"
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
        ) : cargandoPortada ? (
          <SkeletonGroup label="Cargando portada del comunicado">
            <Skeleton testID="portada-skeleton" style={estilos.portada} />
          </SkeletonGroup>
        ) : (
          <View style={estilos.slotVacio}>
            <View style={estilos.slotIcono}>
              <ImagesSquareIcon size={26} color={colors.brand.primary} weight="duotone" />
            </View>
            <ThemedText variant="body" weight="semibold">
              Añadir una portada
            </ThemedText>
            <ThemedText variant="caption" tone="secondary" style={estilos.centrado}>
              Ayuda a que el comunicado destaque en el feed.
            </ThemedText>
            <View style={estilos.accionesPortada}>
              <ThemedButton
                title="Elegir imagen"
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
            </View>
          </View>
        )}
        {errorPortada ? (
          <ThemedText variant="caption" style={estilos.error}>
            {errorPortada}
          </ThemedText>
        ) : null}
      </Card>

      <Card padding="md" style={estilos.tarjeta}>
        <View style={estilos.cabeceraTarjeta}>
          <ThemedText variant="subtitle" weight="semibold">
            Audiencia
          </ThemedText>
          <ThemedText variant="caption" tone="secondary">
            Quién podrá leerlo
          </ThemedText>
        </View>

        {rol === 'COMUNICADOR' ? (
          <View style={estilos.avisoFila}>
            <View style={estilos.avisoIcono}>
              <LockSimpleIcon size={20} color={colors.brand.primary} weight="duotone" />
            </View>
            <View style={estilos.avisoTextos}>
              <ThemedText variant="bodySm" weight="semibold">
                Solo tu decanato
              </ThemedText>
              <ThemedText variant="caption" tone="secondary">
                {decanatoUsuarioNombre
                  ? `Se publicará en ${decanatoUsuarioNombre}.`
                  : 'Se publicará únicamente en tu decanato.'}
              </ThemedText>
            </View>
          </View>
        ) : rol === 'ADMIN' ? (
          <SelectorAudiencia
            seleccionEfectiva={seleccionEfectiva}
            decanatos={decanatos}
            onChange={onCambiarAudiencia}
            disabled={!editable}
          />
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
        {rol === 'ADMIN' && seleccion === null && !errorAudiencia ? (
          <ThemedText variant="caption" tone="secondary">
            Elige una audiencia para continuar.
          </ThemedText>
        ) : null}
      </Card>

      <SeccionAdjuntosPaso
        existentes={adjuntosExistentes}
        cargandoExistentes={cargandoAdjuntos}
        portadaPath={portadaPath}
        nuevos={adjuntosNuevos}
        porEliminar={adjuntosPorEliminar}
        editable={editable}
        error={errorAdjuntos}
        onAgregar={onAgregarAdjuntos}
        onQuitarNuevo={onQuitarAdjuntoNuevo}
        onMarcarExistente={onMarcarAdjuntoExistente}
        onDesmarcarExistente={onDesmarcarAdjuntoExistente}
      />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.canvas },
  contenido: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  tarjeta: {
    gap: spacing.md,
  },
  cabeceraTarjeta: {
    gap: 2,
  },
  bloquePortada: {
    gap: spacing.sm,
  },
  portada: {
    width: '100%',
    aspectRatio: 3 / 2,
    borderRadius: radius.card,
    backgroundColor: colors.brand.surfaceBlue,
  },
  accionesPortada: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  slotVacio: {
    minHeight: 220,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#B9CDE6',
    backgroundColor: colors.brand.surfaceBlue,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  slotIcono: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  centrado: {
    textAlign: 'center',
  },
  avisoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.input,
    backgroundColor: colors.brand.surfaceBlue,
  },
  avisoIcono: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avisoTextos: {
    flex: 1,
    gap: 2,
  },
  error: {
    color: colors.status.danger,
  },
});
