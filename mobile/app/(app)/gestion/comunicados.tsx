import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * La consola es UNA pantalla con secciones por estado; ambas rutas
 * hermanas se retiraron a secciones internas. Este stub solo existe para
 * que las URLs ya emitidas (contadores del panel desplegado, bookmarks
 * web) no rompan: preserva ?estado= al reencaminar.
 */
export default function ColasComunicadosRoute() {
  const { estado } = useLocalSearchParams<{ estado?: string }>();
  const consulta = estado ? `?seccion=colas&estado=${encodeURIComponent(estado)}` : '?seccion=colas';
  return <Redirect href={`/gestion${consulta}` as never} />;
}
