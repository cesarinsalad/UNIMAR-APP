import { createContext, useContext, useState, type ComponentType, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { IconWeight } from 'phosphor-react-native';

import { colors, radius, spacing, touchTarget } from './theme';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { HojaInferior } from './HojaInferior';
import { useEsDesktop } from './useEsDesktop';

/** Peso Phosphor admitido por los iconos de las acciones. */
export type PesoIcono = IconWeight;

export interface AccionGestionItem {
  /** Clave estable de la acción (EDITAR / APROBAR_BORRADOR / ...). */
  clave: string;
  etiqueta: string;
  icono: ComponentType<{ size?: number; color?: string; weight?: PesoIcono }>;
  /** Acción destructiva (rechazo, eliminación): tinta roja. */
  destructiva?: boolean;
}

export interface MenuAccionesProps {
  acciones: AccionGestionItem[];
  /** Acción elegida. El caller ejecuta y gestiona su propio vuelo/errores. */
  onElegir: (clave: string) => void;
  /**
   * Modo controlado (opcional): la sección dueña necesita saber QUÉ fila
   * tiene el menú abierto para elevar esa celda del listado (ver
   * `ContextoMenuAbierto`); sin estos props el menú es dueño de su estado.
   */
  abierto?: boolean;
  onAbiertoChange?: (abierto: boolean) => void;
}

/**
 * Hoja de acciones CONTROLADA (móvil): una sola instancia por sección —
 * las filas solo montan el botón `⋮` y esta hoja centraliza las tarjetas
 * (evita ~30 TrueSheet montados, uno por fila). El caller guarda qué fila
 * abrió; aquí recibe abierta/cerrada y la lista de acciones de ESA fila.
 */
export function HojaMenuAcciones({
  abierto,
  onCerrar,
  acciones,
  onElegir,
}: {
  abierto: boolean;
  onCerrar: () => void;
  acciones: AccionGestionItem[];
  onElegir: (clave: string) => void;
}) {
  return (
    <HojaInferior abierto={abierto} onCerrar={onCerrar}>
      {() => (
        <View style={styles.hojaContenido}>
          {acciones.map((a) => (
            <FilaAccion
              key={a.clave}
              accion={a}
              onElegir={(clave) => {
                onCerrar();
                onElegir(clave);
              }}
            />
          ))}
        </View>
      )}
    </HojaInferior>
  );
}

/**
 * Menú de acciones `⋮` por registro (consola de gestión). En escritorio/
 * tablet: dropdown anclado a la derecha; en móvil: HojaInferior táctil.
 * Las acciones sin permiso no se pasan en absoluto: el caller aplica la
 * matriz de permisos ANTES (ocultar es la UX del sistema; el servidor
 * tiene la última palabra).
 */
export function MenuAcciones({
  acciones,
  onElegir,
  abierto: abiertoControl,
  onAbiertoChange,
}: MenuAccionesProps) {
  const esDesktop = useEsDesktop();
  const [abiertoInterno, setAbiertoInterno] = useState(false);
  const abierto = abiertoControl ?? abiertoInterno;

  function abrir() {
    setAbiertoInterno(true);
    onAbiertoChange?.(true);
  }

  function cerrar() {
    setAbiertoInterno(false);
    onAbiertoChange?.(false);
  }

  function elegir(clave: string) {
    cerrar();
    onElegir(clave);
  }

  const listaAcciones = acciones.map((a) => (
    <FilaAccion key={a.clave} accion={a} onElegir={elegir} />
  ));

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Más acciones"
        hitSlop={spacing.sm}
        onPress={abrir}>
        <View style={styles.boton}>
          <MenuIcono />
        </View>
      </Pressable>

      {esDesktop ? (
        abierto ? (
          <>
            {/* Capa que atrapa el click fuera del menú y lo cierra. */}
            <Pressable
              accessibilityLabel="Cerrar menú"
              style={styles.cortinaWeb}
              onPress={cerrar}
            />
            <ThemedView variant="card" style={styles.desplegable}>
              {listaAcciones}
            </ThemedView>
          </>
        ) : null
      ) : (
        <HojaInferior abierto={abierto} onCerrar={cerrar}>
          {() => <View style={styles.hojaContenido}>{listaAcciones}</View>}
        </HojaInferior>
      )}
    </View>
  );
}

/**
 * Apilamiento web (RN-web): cada View pinta con `position: relative;
 * z-index: 0`, o sea que CADA celda de un listado es su propio stacking
 * context y el dropdown del `⋮` — por más zIndex propio — nunca sale del
 * de su fila: las filas siguientes (mismo z-index 0, después en el DOM)
 * pintan encima y tapan el menú. El antídoto es elevar la CELDA cuyo
 * menú está abierto: las secciones guardan qué fila lo tiene (estado
 * propio), lo publican por este contexto y montan `CeldaConMenu` como
 * `CellRendererComponent` del FlatList, que aplica el desempate a la
 * celda misma (el nivel donde las filas son hermanas).
 */
export const ContextoMenuAbierto = createContext<string | null>(null);

export interface CeldaConMenuProps {
  /** El item de la celda (solo importa su `id`). */
  item?: { id: string };
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** Los handlers se reenvían tal cual el CellRenderer del FlatList los
   *  necesita (medición de celda, resaltado de separadores). */
  onLayout?: (e: LayoutChangeEvent) => void;
  /** Tipo espejo del CellRendererProps del VirtualizedList (su FocusEvent
   *  resuelve al global del DOM por la ambigüedad de los export * de RN). */
  onFocusCapture?: (e: FocusEvent) => void;
}

/** Wrapper de `CellRendererComponent` que sube la celda con el menú
 *  abierto por encima de sus hermanas. En web lo pinta el orden del DOM
 *  si nadie desempata; en nativo el zIndex de la celda desempata igual,
 *  así el dropdown es seguro también en tablet. */
export function CeldaConMenu({ item, style, children, ...resto }: CeldaConMenuProps) {
  const idAbierto = useContext(ContextoMenuAbierto);
  const enCima = item !== undefined && idAbierto === item.id;
  return (
    <View style={[style, enCima && styles.celdaEnCima]} {...resto}>
      {children}
    </View>
  );
}

function FilaAccion({
  accion,
  onElegir,
}: {
  accion: AccionGestionItem;
  onElegir: (clave: string) => void;
}) {
  const Icono = accion.icono;
  const color = accion.destructiva ? colors.status.danger : colors.text.primary;
  return (
    <Pressable accessibilityRole="menuitem" onPress={() => onElegir(accion.clave)}>
      <View style={estilosAccion.fila}>
        <Icono size={18} color={color} />
        <ThemedText variant="bodySm" weight="medium" style={{ color }}>
          {accion.etiqueta}
        </ThemedText>
      </View>
    </Pressable>
  );
}

/**
 * El `⋮` dibujado con Views: evita acoplar el primitivo a phosphor — las
 * secciones de gestión le pasan los iconos que quieran por `acciones`.
 */
function MenuIcono() {
  return (
    <View style={styles.gotasWrap}>
      <View style={styles.gota} />
      <View style={styles.gota} />
      <View style={styles.gota} />
    </View>
  );
}

const styles = StyleSheet.create({
  boton: {
    width: touchTarget.min,
    height: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  cortinaWeb: {
    // Web: `fixed` (honrado por RN-web aunque RN no lo tipa) saca la
    // cortina del containing block de la celda — cada View es relative
    // en web, así el absolute la encerraba en los 48px del botón y el
    // click-fuera nunca cerraba. En nativo el absolute basta.
    ...Platform.select({
      // RN no tipa `fixed` (el runtime web sí lo honra): el cast doble lo
      // declara para TS sin tocar el valor que llega al DOM.
      web: { position: 'fixed' } as unknown as { position: 'absolute' },
      default: { position: 'absolute' },
    }),
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  desplegable: {
    position: 'absolute',
    top: touchTarget.min + spacing.sm,
    right: 0,
    minWidth: 208,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    zIndex: 11,
  },
  /** Desempate de la celda con menú abierto (ver ContextoMenuAbierto):
   *  cualquier positivo supera al z-index 0 base de sus hermanas. */
  celdaEnCima: { zIndex: 20 },
  hojaContenido: { gap: spacing.xs },
  gotasWrap: {
    flexDirection: 'row',
    gap: 3,
  },
  gota: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: colors.text.primary,
  },
});

const estilosAccion = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
