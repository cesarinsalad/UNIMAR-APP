import { Pressable, StyleSheet, View } from 'react-native';
import {
  BellRingingIcon,
  CalendarPlusIcon,
  GraduationCapIcon,
  MegaphoneIcon,
  ProhibitIcon,
} from 'phosphor-react-native';

import {
  PALETA_ESTADO_PUBLICACION,
  ThemedText,
  colors,
  radius,
  spacing,
} from '@/shared/ui';
import type { Notificacion, TipoNotificacion } from '../types';
import { horaNotificacion } from '../grupos';

type IconoPhosphor = React.ComponentType<{
  size?: number;
  color?: string;
  weight?: 'regular' | 'fill' | 'duotone';
}>;

interface PresentacionTipo {
  /** Clasificación breve: no repite el titular, lo firma. */
  etiqueta: string;
  Icono: IconoPhosphor;
  /** Solo los rechazos exigen acción: llevan el tono de "devuelto". */
  alerta?: boolean;
}

const TIPOS: Record<TipoNotificacion, PresentacionTipo> = {
  COMUNICADO_PUBLICADO: { etiqueta: 'Comunicado', Icono: MegaphoneIcon },
  COMUNICADO_RECHAZADO: {
    etiqueta: 'Comunicado rechazado',
    Icono: ProhibitIcon,
    alerta: true,
  },
  EVENTO_OFICIAL_CREADO: { etiqueta: 'Evento oficial', Icono: CalendarPlusIcon },
  EVENTO_RECORDATORIO: { etiqueta: 'Recordatorio', Icono: BellRingingIcon },
  NOTA_PUBLICADA: { etiqueta: 'Nota publicada', Icono: GraduationCapIcon },
};

interface Props {
  notificacion: Notificacion;
  /** La pantalla decide qué hacer al tocar (marcar leída + deep-link). */
  onAbrir: (notificacion: Notificacion) => void;
}

/**
 * Fila del registro de novedades (NO es una tarjeta: vive dentro del
 * documento del día, en NotificacionesList). El tipo se firma con icono +
 * clasificación al pie del bloque; el titular manda. Sin lectura = punto
 * naranja sobre el icono (el mismo lenguaje de la campana) + peso semibold.
 */
export function NotificacionFila({ notificacion, onAbrir }: Props) {
  const noLeida = !notificacion.leida;
  const { etiqueta, Icono, alerta } = TIPOS[notificacion.tipo];
  const hora = horaNotificacion(notificacion.createdAt);

  return (
    <Pressable
      onPress={() => onAbrir(notificacion)}
      accessibilityRole="button"
      accessibilityLabel={`${etiqueta}${noLeida ? ', sin leer' : ''}. ${notificacion.titulo}. ${notificacion.cuerpo}`}
      android_ripple={{ color: colors.brand.surfaceBlue }}
      style={({ pressed }) => [estilos.fila, pressed && estilos.presionada]}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          estilos.tile,
          alerta && { backgroundColor: PALETA_ESTADO_PUBLICACION.DEVUELTO.bgLight },
        ]}>
        <Icono
          size={20}
          color={
            alerta
              ? PALETA_ESTADO_PUBLICACION.DEVUELTO.color
              : colors.brand.primary
          }
          weight="regular"
        />
        {noLeida ? <View style={estilos.punto} /> : null}
      </View>

      <View style={estilos.textos}>
        <ThemedText
          variant="caption"
          weight={noLeida ? 'semibold' : 'medium'}
          numberOfLines={2}>
          {notificacion.titulo}
        </ThemedText>
        {notificacion.cuerpo ? (
          <ThemedText variant="caption" tone="secondary" numberOfLines={1}>
            {notificacion.cuerpo}
          </ThemedText>
        ) : null}
        <ThemedText variant="caption" tone="secondary" numberOfLines={1}>
          {hora ? `${etiqueta} · ${hora}` : etiqueta}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const TAM_TILE = 40;

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg.surface,
  },
  presionada: {
    backgroundColor: colors.bg.canvas,
  },
  tile: {
    width: TAM_TILE,
    height: TAM_TILE,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.surfaceBlue,
  },
  /** Punto de no leída: 10px con anillo del color de la fila para separarlo
   *  del icono (mismo tratamiento que el punto de la campana). */
  punto: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.accent.urgent,
    borderWidth: 2,
    borderColor: colors.bg.surface,
  },
  textos: {
    flex: 1,
    gap: 2,
  },
});
