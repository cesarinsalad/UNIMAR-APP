import { useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';

import type { HojaInferiorProps } from './HojaInferior';
import { colors, radius, spacing, layout } from './theme';

/**
 * Hoja inferior genérica del sistema, VARIANTE NATIVA: hoja del sistema
 * con @lodev09/react-native-true-sheet (detents, arrastre continuo,
 * grabber y dim). Cero reanimated: la incompatibilidad reanimated-4 que
 * mató a @gorhom/bottom-sheet no aplica. La variante WEB vive en
 * HojaInferior.tsx (Modal slide); Metro la resuelve por sufijo, por eso
 * ambas comparten la MISMA API — las pantallas solo hablan
 * abierto/onCerrar/cerrar.
 *
 * Control declarativo: el efecto presenta/desliza según `abierto`. Los
 * contenidos cierran por cuenta propia con `cerrar()` (animado); el cierre
 * definitivo baja por `onDidDismiss` → `onCerrar` — así la pantalla que la
 * montó limpia su estado (o `router.back()`, en el anfitrión /eventos/[id])
 * DESPUÉS de la animación, nunca con desmontaje brusco.
 */
export function HojaInferior({ abierto, onCerrar, children }: HojaInferiorProps) {
  // Ref tipada a la clase: los métodos (present/dismiss/resize) viven ahí.
  const hoja = useRef<TrueSheet>(null);
  // Conexión del scrollable: el detent 'auto' mide este ScrollView.
  const scrollRef = useRef<ScrollView>(null);
  const onDidDismiss = useCallback(() => onCerrar(), [onCerrar]);
  const cerrar = useCallback(() => {
    hoja.current?.dismiss().catch(() => undefined);
  }, []);

  /**
   * Guard de presentación: solo un flip de `abierto` en un hoja ya
   * PRESENTADA dispara el dismiss. El cierre nativo también baja por
   * onDidDismiss → onCerrar → estado null → efecto — sin el guard, ese
   * segundo dismiss golpeaba a una vista ya desmontada (lazy) y el módulo
   * nativo devolvía (uncaught) el rechazo VIEW_NOT_FOUND.
   */
  const presentada = useRef(false);

  useEffect(() => {
    if (abierto) {
      presentada.current = true;
      hoja.current?.present().catch(() => undefined);
    } else if (presentada.current) {
      presentada.current = false;
      hoja.current?.dismiss().catch(() => undefined);
    }
  }, [abierto]);

  return (
    // detents: ['auto', 1] — altura natural = medida del contenido y
    // arrastrable hasta pantalla completa. `scrollableRef` conecta el
    // ScrollView interno: así el auto detent mide el contenido largo y el
    // nested-scroll/teclado quedan cableados. Safe-area la maneja la hoja
    // con `insetAdjustment` default — sin padding manual (guía v4).
    <TrueSheet
      ref={hoja}
      detents={['auto', 1]}
      dimmed
      dimColor="rgba(0,0,0,0.45)"
      grabber
      cornerRadius={radius.card}
      backgroundColor={colors.bg.surface}
      maxContentWidth={layout.maxContentWidth}
      scrollableRef={scrollRef}
      onDidDismiss={onDidDismiss}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}>
        {children?.({ cerrar })}
      </ScrollView>
    </TrueSheet>
  );
}

const estilos = StyleSheet.create({
  /** Padding del contenido: aire xl (24) al tope — entre el grabber y el
   *  primer bloque (barra de acciones); lateral/bajado a lg. El cierre
   *  seguro inferior lo suma el `insetAdjustment` nativo de la hoja. */
  contenido: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
});
