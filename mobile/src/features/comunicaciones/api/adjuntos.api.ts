import { Platform } from 'react-native';
import { uploadAsync } from 'expo-file-system/legacy';

import { api } from '@/shared/api/axios';
import type { Adjunto } from '../types';

/**
 * API de adjuntos del módulo comunicaciones. Implementa el flujo de dos
 * fases del contrato:
 *  (1) POST url-carga → URL firmada de Storage
 *  (2) subida DIRECTA a la URL firmada (PUT; nunca pasa por el BFF)
 *  (3) POST /adjuntos → registro de metadatos
 * Un fallo en fase 2/3 NO registra metadatos → reintento seguro.
 */

export interface ArchivoAdjunto {
  uri: string;
  nombre: string;
  mimeType: string;
  tamano: number;
}

export async function listarAdjuntos(comunicadoId: string): Promise<Adjunto[]> {
  const { data } = await api.get<Adjunto[]>(`/comunicados/${comunicadoId}/adjuntos`);
  return data;
}

export interface UrlCargaResult {
  path: string;
  urlFirmada: string;
  token: string;
}

export async function solicitarUrlCarga(
  comunicadoId: string,
  archivo: Pick<ArchivoAdjunto, 'nombre' | 'mimeType' | 'tamano'>,
): Promise<UrlCargaResult> {
  const { data } = await api.post<UrlCargaResult>(
    `/comunicados/${comunicadoId}/adjuntos/url-carga`,
    {
      nombre: archivo.nombre,
      mime_type: archivo.mimeType,
      tamano: archivo.tamano,
    },
  );
  return data;
}

export async function registrarAdjunto(
  comunicadoId: string,
  path: string,
  archivo: Pick<ArchivoAdjunto, 'nombre' | 'mimeType' | 'tamano'>,
): Promise<Adjunto> {
  const { data } = await api.post<Adjunto>(`/comunicados/${comunicadoId}/adjuntos`, {
    path,
    nombre: archivo.nombre,
    mime_type: archivo.mimeType,
    tamano: archivo.tamano,
  });
  return data;
}

export async function eliminarAdjunto(adjuntoId: string): Promise<void> {
  await api.delete(`/adjuntos/${adjuntoId}`);
}

/** URL firmada de descarga (TTL 300s) para abrir desde la UI. */
export async function urlDescargaAdjunto(adjuntoId: string): Promise<string> {
  const { data } = await api.get<{ url: string }>(`/adjuntos/${adjuntoId}/url-descarga`);
  return data.url;
}

const NGROK_HOST_RE = /\.ngrok(-free)?\.(dev|app|io)$/i;

/** Detecta si una URL firmada pasa por un túnel ngrok de desarrollo. */
export function esUrlNgrok(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return NGROK_HOST_RE.test(hostname);
  } catch {
    return false;
  }
}

/**
 * Construye el `source` de `<Image>`: en nativo adjunta la cabecera que salta
 * el intersticial de ngrok solo cuando la URL pertenece a ngrok; en producción
 * (Supabase Cloud) devuelve `{ uri }` sin cabeceras adicionales.
 */
export function fuenteImagen(uri: string): { uri: string; headers?: Record<string, string> } {
  if (Platform.OS !== 'web' && esUrlNgrok(uri)) {
    return { uri, headers: { 'ngrok-skip-browser-warning': 'true' } };
  }
  return { uri };
}

/**
 * Resuelve una URL de imagen para `<Image>`: en web, `<img>` ignora
 * `source.headers`, por lo que si la URL apunta a ngrok se descarga con `fetch`
 * enviando `ngrok-skip-browser-warning` y se expone como `blob:` URL local.
 * En producción (no ngrok) o en nativo devuelve la URL intacta sin `fetch`.
 */
export async function resolverUrlImagen(url: string): Promise<string> {
  if (Platform.OS !== 'web' || !esUrlNgrok(url)) return url;
  const respuesta = await fetch(url, {
    headers: { 'ngrok-skip-browser-warning': 'true' },
  });
  if (!respuesta.ok) {
    throw new Error(`No se pudo cargar la imagen (${respuesta.status})`);
  }
  const contentType = respuesta.headers.get('content-type') ?? '';
  if (contentType.toLowerCase().includes('text/html')) {
    throw new Error('La respuesta recibida no es una imagen válida.');
  }
  const blob = await respuesta.blob();
  return URL.createObjectURL(blob);
}

/**
 * Fase 2: subida DIRECTA a la URL firmada de Supabase Storage (PUT), sin
 * pasar por el BFF. En nativo usa la API legacy del filesystem para el
 * uploader binario (uploadAsync está en expo-file-system/legacy desde SDK
 * 54). En web uploadAsync no existe (la build web de expo-file-system es
 * un shim vacío): los pickers devuelven URIs blob:/data: que fetch
 * materializa como Blob, y el PUT se hace con fetch del navegador.
 *
 * No lanza NotFoundError de dominio: los fallos de esta fase se propagan
 * como errores crudos y el orquestador decide el mensaje.
 */
export async function subirArchivo(
  urlFirmada: string,
  archivo: Pick<ArchivoAdjunto, 'uri' | 'mimeType'>,
): Promise<void> {
  // En dev detrás de ngrok, el header evita el intersticial HTML del plan free;
  // en producción (Supabase Cloud) no se añade para no provocar rechazos CORS.
  const headers: Record<string, string> = {
    'Content-Type': archivo.mimeType,
  };
  if (esUrlNgrok(urlFirmada)) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }

  if (Platform.OS === 'web') {
    const blob = await fetch(archivo.uri).then((r) => r.blob());
    const respuesta = await fetch(urlFirmada, {
      method: 'PUT',
      headers,
      body: blob,
    });
    if (!respuesta.ok) {
      throw new Error(`El servidor de adjuntos respondió ${respuesta.status}`);
    }
    return;
  }

  // uploadAsync (legacy) resuelve incluso con 4xx/5xx: sin leer el status, un
  // rechazo de Storage se manifestaría después como "archivo no encontrado".
  const resultado = await uploadAsync(urlFirmada, archivo.uri, {
    httpMethod: 'PUT',
    headers,
    uploadType: 1, // MULTIPART vs BINARY: 1 = binary (PUT directo)
  });
  if (resultado.status < 200 || resultado.status >= 300) {
    throw new Error(`El servidor de adjuntos respondió ${resultado.status}`);
  }
}

/** Orquesta las dos fases: URL firmada → subida → registro. */
export async function subirAdjunto(
  comunicadoId: string,
  archivo: ArchivoAdjunto,
): Promise<Adjunto> {
  const firma = await solicitarUrlCarga(comunicadoId, archivo);
  await subirArchivo(firma.urlFirmada, archivo);
  return registrarAdjunto(comunicadoId, firma.path, archivo);
}