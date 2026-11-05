import { useState, type ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
export function MenuAcciones({ acciones, onElegir }: MenuAccionesProps) {
  const esDesktop = useEsDesktop();
  const [abierto, setAbierto] = useState(false);
  const cerrar = () => setAbierto(false);

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
        onPress={() => setAbierto(true)}>
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
    position: 'absolute' as const,
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
