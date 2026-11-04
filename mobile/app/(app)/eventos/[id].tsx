import { router, useLocalSearchParams } from 'expo-router';

import { HojaEvento } from '@/features/calendario/components/HojaEvento';

/**
 * Detalle de evento como ANFITRIÓN de la hoja: la verdadera UI del detalle
 * es la HojaEvento (bottom sheet con acciones incluidas); la ruta sigue
 * existiendo porque los caminos externos del sistema tienen destino
 * navegable — deep-links de push (rutas.ts) y los pushes de la consola de
 * gestión (EventosSeccion/PanelSeccion). Presenta la hoja al montar; al
 * cerrar (arrastre, dim o Android-back) `router.back()` descubre el fondo
 * real. La pantalla no pinta nada propio: presentación transparente
 * (Stack.Screen en (app)/_layout), la anterior queda visible tras el dim.
 */
export default function EventoDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <HojaEvento eventoId={id ?? null} onCerrar={() => router.back()} />;
}
