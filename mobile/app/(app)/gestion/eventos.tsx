import { Redirect } from 'expo-router';

/**
 * La consola es UNA pantalla con secciones internas; esta ruta se retiró.
 * Stub para tolerar URLs antiguas sin 404.
 */
export default function EventosGestionRoute() {
  return <Redirect href={'/gestion?seccion=eventos' as never} />;
}
