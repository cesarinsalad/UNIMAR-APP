import { Redirect } from 'expo-router';

/**
 * Las colas de gestión viven en la consola de staff (/gestion), una sola
 * pantalla con secciones internas. Stub para URLs antiguas (bookmarks web).
 */
export default function MisComunicadosScreen() {
  return <Redirect href={'/gestion?seccion=colas' as never} />;
}

