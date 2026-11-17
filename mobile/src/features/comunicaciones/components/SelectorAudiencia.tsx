import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  BooksIcon,
  BuildingsIcon,
  ChartLineUpIcon,
  CheckIcon,
  GearSixIcon,
  GlobeHemisphereWestIcon,
  PaletteIcon,
  ScalesIcon,
} from 'phosphor-react-native';

import { HojaInferior } from '@/shared/ui/HojaInferior';
import { SelectTrigger } from '@/shared/ui/Select';
import { ThemedButton } from '@/shared/ui/ThemedButton';
import { ThemedText } from '@/shared/ui/ThemedText';
import { colors, radius, spacing } from '@/shared/ui/theme';

export interface DecanatoAudiencia {
  id: number;
  nombre: string;
}

type Icono = React.ComponentType<{
  size?: number;
  color?: string;
  weight?: 'regular' | 'fill' | 'duotone';
}>;

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es');
}

/**
 * Icono representativo del decanato según su nombre. Los nombres son datos
 * de la universidad (placeholder en seed, ajustables), así que el mapeo es
 * por palabras clave con fallback al edificio genérico: un decanato nuevo
 * nunca se queda sin icono.
 */
export function iconoDeDecanato(nombre: string): Icono {
  const clave = normalizar(nombre);
  if (clave.includes('estudios generales')) return BooksIcon;
  if (
    clave.includes('humanidades') ||
    clave.includes('artes') ||
    clave.includes('educacion')
  ) {
    return PaletteIcon;
  }
  if (clave.includes('economicas') || clave.includes('sociales')) {
    return ChartLineUpIcon;
  }
  if (
    clave.includes('juridicas') ||
    clave.includes('politicas') ||
    clave.includes('derecho')
  ) {
    return ScalesIcon;
  }
  if (clave.includes('ingenieria')) return GearSixIcon;
  return BuildingsIcon;
}

interface Props {
  /**
   * Audiencia resuelta para el rol: null = el ADMIN aún no eligió;
   * [] = toda la universidad; [ids] = decanatos concretos.
   */
  seleccionEfectiva: number[] | null;
  decanatos: readonly DecanatoAudiencia[];
  onChange: (seleccion: number[]) => void;
  disabled?: boolean;
}

/**
 * Audiencia del comunicado como dropdown del sistema: trigger con la misma
 * piel que los filtros de las listas + HojaInferior con selección múltiple.
 * "Toda la universidad" es excluyente con los decanatos (el dominio expresa
 * el alcance global como lista vacía).
 */
export function SelectorAudiencia({
  seleccionEfectiva,
  decanatos,
  onChange,
  disabled = false,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const efectiva = seleccionEfectiva ?? [];
  const sinElegir = seleccionEfectiva === null;
  const globalActiva = !sinElegir && efectiva.length === 0;

  function nombreDe(id: number): string {
    return decanatos.find((d) => d.id === id)?.nombre ?? `Decanato ${id}`;
  }

  const primero = efectiva[0];
  const resumen = sinElegir
    ? 'Elegir audiencia'
    : efectiva.length === 0
      ? 'Toda la universidad'
      : efectiva.length === 1
        ? nombreDe(primero ?? 0)
        : `${efectiva.length} decanatos`;

  function alternarDecanato(id: number) {
    const siguiente = efectiva.includes(id)
      ? efectiva.filter((decanatoId) => decanatoId !== id)
      : [...efectiva, id];
    // Sin decanatos el alcance vuelve a ser global ([] = GLOBAL): la fila
    // "Toda la universidad" queda marcada y la UI no miente al usuario.
    onChange(siguiente);
  }

  return (
    <View style={estilos.contenedor}>
      <SelectTrigger
        etiqueta={resumen}
        placeholder={sinElegir}
        disabled={disabled}
        onPress={() => setAbierto(true)}
        accessibilityLabel={`Audiencia: ${resumen}`}
      />
      {efectiva.length > 1 ? (
        <ThemedText variant="caption" tone="secondary">
          {efectiva.map(nombreDe).join(' · ')}
        </ThemedText>
      ) : null}

      <HojaInferior abierto={abierto} onCerrar={() => setAbierto(false)}>
        {({ cerrar }) => (
          <View style={estilos.hoja}>
            <View style={estilos.cabeceraHoja}>
              <ThemedText variant="subtitle" weight="semibold">
                Audiencia
              </ThemedText>
              <ThemedText variant="caption" tone="secondary">
                Elige quién podrá leer este comunicado.
              </ThemedText>
            </View>

            <FilaOpcion
              etiqueta="Toda la universidad"
              icono={GlobeHemisphereWestIcon}
              activa={globalActiva}
              disabled={disabled}
              onPress={() => onChange([])}
            />

            <View style={estilos.separador} />

            <ThemedText variant="caption" tone="secondary">
              Decanatos
            </ThemedText>

            <View style={estilos.opciones}>
              {decanatos.map((decanato) => (
                <FilaOpcion
                  key={decanato.id}
                  etiqueta={decanato.nombre}
                  icono={iconoDeDecanato(decanato.nombre)}
                  activa={efectiva.includes(decanato.id)}
                  disabled={disabled}
                  onPress={() => alternarDecanato(decanato.id)}
                />
              ))}
            </View>

            <ThemedText variant="caption" tone="secondary" style={estilos.nota}>
              Sin decanatos seleccionados, se publica para toda la universidad.
            </ThemedText>

            <ThemedButton
              title="Listo"
              disabled={disabled}
              onPress={cerrar}
            />
          </View>
        )}
      </HojaInferior>
    </View>
  );
}

/** Fila de la hoja: icono en tile, etiqueta y marca de selección. */
function FilaOpcion({
  etiqueta,
  icono: Icono,
  activa,
  disabled,
  onPress,
}: {
  etiqueta: string;
  icono: Icono;
  activa: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={etiqueta}
      accessibilityState={{ checked: activa, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.fila,
        activa && estilos.filaActiva,
        disabled && estilos.filaDeshabilitada,
        pressed && !disabled && estilos.filaPresionada,
      ]}>
      <View style={[estilos.tile, activa && estilos.tileActiva]}>
        <Icono
          size={20}
          color={activa ? colors.brand.primary : colors.text.secondary}
          weight={activa ? 'fill' : 'regular'}
        />
      </View>
      <ThemedText
        variant="bodySm"
        weight={activa ? 'semibold' : 'medium'}
        numberOfLines={2}
        style={[estilos.etiqueta, activa && estilos.etiquetaActiva]}>
        {etiqueta}
      </ThemedText>
      <View style={[estilos.marca, activa && estilos.marcaActiva]}>
        {activa ? <CheckIcon size={14} color={colors.brand.onPrimary} weight="bold" /> : null}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    gap: spacing.xs,
  },
  hoja: {
    gap: spacing.md,
  },
  cabeceraHoja: {
    gap: 2,
  },
  separador: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
  },
  opciones: {
    gap: spacing.xs,
  },
  nota: {
    marginTop: -spacing.xs,
  },
  fila: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.input,
  },
  filaActiva: {
    backgroundColor: colors.brand.surfaceBlue,
  },
  filaPresionada: {
    opacity: 0.75,
  },
  filaDeshabilitada: {
    opacity: 0.5,
  },
  tile: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileActiva: {
    backgroundColor: colors.bg.surface,
  },
  etiqueta: {
    flex: 1,
  },
  etiquetaActiva: {
    color: colors.brand.primary,
  },
  marca: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcaActiva: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primary,
  },
});
