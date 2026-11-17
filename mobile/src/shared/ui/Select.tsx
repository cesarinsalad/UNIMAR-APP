import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { CaretDownIcon, MagnifyingGlassIcon, XIcon } from 'phosphor-react-native';

import { colors, fontFamily, radius, sinAnilloNativo, spacing } from './theme';
import { HojaInferior } from './HojaInferior';
import { ThemedText } from './ThemedText';

export interface OpcionSelect<T extends string | number | null> {
  valor: T;
  etiqueta: string;
}

export interface SelectProps<T extends string | number | null> {
  /** Valor actual; undefined = sin selección (muestra el placeholder). */
  valor?: T;
  opciones: OpcionSelect<T>[];
  onChange: (valor: T) => void;
  placeholder?: string;
  /**
   * Valor que representa "sin filtro": el trigger muestra el placeholder
   * (nombre del campo) aunque esa opción siga seleccionada en la hoja.
   */
  valorPlaceholder?: T;
  /** Título de la hoja; si se omite, usa el placeholder. */
  titulo?: string;
  /** Fuerza el buscador; por defecto aparece con más de 7 opciones. */
  buscable?: boolean;
  placeholderBusqueda?: string;
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es');
}

export interface SelectTriggerProps {
  /** Texto visible: opción actual o placeholder. */
  etiqueta: string;
  /** true = sin selección (el texto se atenúa). */
  placeholder?: boolean;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}

/**
 * Piel del disparador de un Select: campo blanco con borde sutil y caret.
 * Se exporta para que otros selectores del sistema (p. ej. la audiencia
 * multi-selección) mantengan exactamente el mismo aspecto que los filtros
 * de las listas.
 */
export function SelectTrigger({
  etiqueta,
  placeholder = false,
  disabled = false,
  onPress,
  accessibilityLabel,
}: SelectTriggerProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? etiqueta}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={{ top: spacing.xs, bottom: spacing.xs }}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.fila,
        disabled && estilos.deshabilitado,
        pressed && !disabled && estilos.presionada,
      ]}>
      <ThemedText
        variant="bodySm"
        numberOfLines={1}
        style={[estilos.textoTrigger, placeholder && estilos.textoPlaceholder]}>
        {etiqueta}
      </ThemedText>
      <CaretDownIcon size={16} color={colors.text.secondary} />
    </Pressable>
  );
}

/**
 * Select del sistema: trigger blanco + HojaInferior compartida (TrueSheet en
 * nativo, Modal slide en web). Las opciones viven en una cuadrícula de dos
 * columnas para conservar el mismo patrón en ambas plataformas; la selección
 * se aplica y la hoja se cierra al toque.
 */
export function Select<T extends string | number | null>({
  valor,
  opciones,
  onChange,
  placeholder = 'Seleccionar…',
  valorPlaceholder,
  titulo,
  buscable,
  placeholderBusqueda = 'Buscar…',
}: SelectProps<T>) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const actual = opciones.find((o) => o.valor === valor);
  const mostrarBuscador = buscable ?? opciones.length > 7;
  const mostrarPlaceholder = actual === undefined || valor === valorPlaceholder;

  const opcionesFiltradas = useMemo(() => {
    if (!mostrarBuscador || busqueda.trim() === '') return opciones;
    const q = normalizar(busqueda.trim());
    return opciones.filter((opcion) => normalizar(opcion.etiqueta).includes(q));
  }, [busqueda, mostrarBuscador, opciones]);

  function abrir() {
    setBusqueda('');
    setAbierto(true);
  }

  return (
    <View>
      <SelectTrigger
        etiqueta={mostrarPlaceholder ? placeholder : actual?.etiqueta ?? placeholder}
        placeholder={mostrarPlaceholder}
        onPress={abrir}
      />

      <HojaInferior abierto={abierto} onCerrar={() => setAbierto(false)}>
        {({ cerrar }) => (
          <View style={estilos.contenido}>
            <ThemedText variant="subtitle" weight="semibold">
              {titulo ?? placeholder}
            </ThemedText>

            {mostrarBuscador ? (
              <View style={estilos.buscador}>
                <MagnifyingGlassIcon size={18} color={colors.text.secondary} />
                <TextInput
                  value={busqueda}
                  onChangeText={setBusqueda}
                  placeholder={placeholderBusqueda}
                  placeholderTextColor={colors.text.secondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel={placeholderBusqueda}
                  style={estilos.buscadorInput}
                />
                {busqueda.length > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Limpiar búsqueda"
                    hitSlop={spacing.sm}
                    onPress={() => setBusqueda('')}>
                    <XIcon size={16} color={colors.text.secondary} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {opcionesFiltradas.length > 0 ? (
              <View style={estilos.grid}>
                {opcionesFiltradas.map((opcion) => {
                  const activa = opcion.valor === valor;
                  return (
                    <Pressable
                      key={String(opcion.valor)}
                      accessibilityRole="button"
                      accessibilityLabel={opcion.etiqueta}
                      accessibilityState={{ selected: activa }}
                      onPress={() => {
                        onChange(opcion.valor);
                        cerrar();
                      }}
                      style={({ pressed }) => [
                        estilos.opcion,
                        activa && estilos.opcionActiva,
                        pressed && estilos.presionada,
                      ]}>
                      <ThemedText
                        variant="bodySm"
                        weight={activa ? 'semibold' : 'medium'}
                        numberOfLines={2}
                        style={[estilos.opcionTexto, activa && estilos.opcionTextoActivo]}>
                        {opcion.etiqueta}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <ThemedText variant="bodySm" tone="secondary" style={estilos.sinResultados}>
                Sin coincidencias
              </ThemedText>
            )}
          </View>
        )}
      </HojaInferior>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
  },
  textoTrigger: { flexShrink: 1 },
  textoPlaceholder: { color: colors.text.secondary },
  presionada: { opacity: 0.85 },
  deshabilitado: { opacity: 0.5 },
  contenido: { gap: spacing.lg },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.input,
    backgroundColor: colors.bg.sunken,
  },
  buscadorInput: {
    flex: 1,
    minWidth: 0,
    color: colors.text.primary,
    fontFamily: fontFamily.regular,
    paddingVertical: spacing.sm,
    fontSize: 14,
    ...sinAnilloNativo,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  opcion: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 0,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  opcionActiva: {
    backgroundColor: colors.brand.surfaceBlue,
    borderColor: colors.brand.primary,
    borderWidth: 2,
  },
  opcionTexto: { textAlign: 'center' },
  opcionTextoActivo: { color: colors.brand.primary },
  sinResultados: {
    paddingVertical: spacing.xl,
    textAlign: 'center',
  },
});
