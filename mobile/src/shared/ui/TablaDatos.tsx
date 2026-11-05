import { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, spacing } from './theme';
import { ThemedText } from './ThemedText';
import { SeparadorFino } from './EstadosBasicos';

export interface ColumnaTabla {
  /** Título visible en la cabecera. */
  titulo: string;
  /** Peso relativo de la columna dentro de la fila (default 1). */
  flex?: number;
  /** Ancho fijo en px; gana sobre `flex` (columnas de dato corto). */
  width?: number;
  align?: 'left' | 'right';
}

export interface TablaDatosProps<T> {
  columnas: ColumnaTabla[];
  items: T[];
  keyExtractor: (item: T) => string;
  /**
   * Contenido de LAS CELDAS de la fila (los bordes/acciones los pone el
   * caller). Envolver cada celda en <Celda columna={...}> mantiene el
   * layout alineado con la cabecera sin duplicar estilos.
   */
  renderFila: (item: T) => React.ReactNode;
  /** Tap en la fila (abrir detalle/observación). */
  onFila?: (item: T) => void;
}

/**
 * Tabla de datos de escritorio/tablet: cabecera de columnas, filas con
 * hover de tinte institucional (web) y la retícula compartida con la
 * llamada (Celda/estiloColumna). Los separadores finos entre filas los
 * aporta el caller (SeparadorFino) para mantener el control del ritmo.
 */
export function TablaDatos<T>({
  columnas,
  items,
  keyExtractor,
  renderFila,
  onFila,
}: TablaDatosProps<T>) {
  return (
    <View style={styles.raiz}>
      <View style={styles.cabecera}>
        {columnas.map((c) => (
          <View key={c.titulo} style={estiloColumna(c)}>
            <ThemedText variant="caption" tone="tertiary">
              {c.titulo}
            </ThemedText>
          </View>
        ))}
      </View>
      {items.map((item, indice) => (
        <View key={keyExtractor(item)}>
          {(indice > 0) ? <SeparadorFino /> : null}
          <Fila onFila={onFila ? () => onFila(item) : undefined}>
            {renderFila(item)}
          </Fila>
        </View>
      ))}
    </View>
  );
}

/** Una fila: opcionalmente presionable, con hover de superficie azul. */
function Fila({ onFila, children }: { onFila?: () => void; children: React.ReactNode }) {
  const [enHover, setEnHover] = useState(false);
  const conHover = Platform.OS === 'web' && enHover;

  const contenido = (
    <View style={[estilosFila.fila, conHover && estilosFila.filaHover]}>{children}</View>
  );

  if (!onFila) {
    return contenido;
  }
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onFila}
      // Hover solo existe en web; RN nativo los ignora sin costo.
      onHoverIn={() => setEnHover(true)}
      onHoverOut={() => setEnHover(false)}>
      {contenido}
    </Pressable>
  );
}

/**
 * Celda de una fila. `columna` replica la geometría que TablaDatos usa en
 * la cabecera, así el caller no duplica estilos ni desalinea columnas.
 */
export function Celda({
  columna,
  children,
  style,
}: {
  columna: ColumnaTabla;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[estiloColumna({ flex: 1, ...columna }), style]}>
      {children}
    </View>
  );
}

export function estiloColumna({ flex, width, align }: ColumnaTabla): ViewStyle {
  const base: ViewStyle = { justifyContent: align === 'right' ? 'flex-end' : 'flex-start' };
  // `width` GANA sobre flex (dato corto: fecha, badge): evita que el flex
  // comprima la columna en pantallas tablet angostas.
  if (width !== undefined) {
    return { ...base, width };
  }
  return { ...base, flex: flex ?? 1 };
}

const styles = StyleSheet.create({
  raiz: {
    borderRadius: 12,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg.canvas,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
});

const estilosFila = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  filaHover: { backgroundColor: colors.brand.surfaceBlue },
});
