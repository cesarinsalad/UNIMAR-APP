import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  type ViewToken,
  type ViewabilityConfig,
  View,
} from 'react-native';

import { colors, layout, spacing } from '@/shared/ui';
import { NoticiaDestacada } from './NoticiaDestacada';
import type { Comunicado } from '../types';

const DURACION_MS = 6000;
/** Tras un gesto manual, esperar este silencio antes de reanudar el auto-avance. */
const REANUDAR_MS = 3000;
/** Umbral del track de viewable: 60% del slide visible = pantalla activa. */
const CONFIG_VIEWABLE: ViewabilityConfig = { viewAreaCoveragePercentThreshold: 60 };

/** Punto del indicador: activo azul sólido, inactivo azul al 25%. */
function Punto({ activo }: { activo: boolean }) {
  return (
    <View style={[estilos.punto, activo && estilos.puntoActivo]} />
  );
}

/**
 * Carrusel de noticias destacadas: FlatList horizontal insetted (respeta el
 * padding.screenPadding del padre), avanza al siguiente item cada 6 s (con
 * 3 s de pausa tras cualquier gesto manual) y se envuelve al llegar al
 * final. El ancho del slide se fija en píxeles y se declara `getItemLayout`,
 * de modo que `scrollToIndex` nunca depende de estimaciones de RN (error
 * clásico del carrusel: rebote al índice 0 por offsets mal estimados).
 * Con 1 sola noticia se comporta como tarjeta estática (sin dots ni timer).
 */
export function CarruselNoticias({ comunicados }: { comunicados: Comunicado[] }) {
  const { width: pantalla } = useWindowDimensions();
  const anchoSlide = pantalla - layout.screenPadding * 2;

  const items = useMemo(() => comunicados.slice(0, 10), [comunicados]);
  const total = items.length;
  const listRef = useRef<FlatList<Comunicado>>(null);
  const [indice, setIndice] = useState(0);
  // Timestamp del último gesto manual: el timer consulta, no lo despierta.
  const lastInteraction = useRef(0);

  // Track de viewable: el índice real lo manda el gesto (scroll manual).
  const onViewableItemsRef = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0]?.index != null) {
        setIndice(viewableItems[0].index);
      }
    },
  ).current;

  useEffect(() => {
    if (total <= 1) return;
    const timer = setInterval(() => {
      if (Date.now() - lastInteraction.current < REANUDAR_MS) return;
      const siguiente = indice + 1 >= total ? 0 : indice + 1;
      listRef.current?.scrollToIndex({ index: siguiente, animated: true });
    }, DURACION_MS);
    return () => clearInterval(timer);
  }, [indice, total]);

  if (total === 0) return null;

  return (
    <View style={estilos.contenedor}>
      <FlatList
        ref={listRef}
        horizontal
        data={items}
        keyExtractor={(c) => c.id}
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        // Layout medido: sin estimaciones → scrollToIndex nunca falla.
        getItemLayout={(_item, i) => ({
          length: anchoSlide,
          offset: anchoSlide * i,
          index: i,
        })}
        onScrollBeginDrag={() => {
          lastInteraction.current = Date.now();
        }}
        viewabilityConfig={CONFIG_VIEWABLE}
        onViewableItemsChanged={onViewableItemsRef}
        renderItem={({ item }) => (
          <View style={{ width: anchoSlide }}>
            <NoticiaDestacada comunicado={item} ancho={anchoSlide} />
          </View>
        )}
      />
      {total > 1 ? (
        <View
          style={estilos.indicador}
          accessible
          accessibilityLabel={`Noticia ${indice + 1} de ${total}`}>
          {items.map((item, i) => (
            <Pressable
              key={item.id}
              onPress={() => listRef.current?.scrollToIndex({ index: i, animated: true })}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Ir a la noticia ${i + 1}`}>
              <Punto activo={i === indice} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    gap: spacing.sm,
  },
  indicador: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs + 4,
  },
  punto: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: `${colors.brand.primary}40`,
  },
  puntoActivo: {
    backgroundColor: colors.brand.primary,
  },
});
