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

/**
 * Fase 2: subida DIRECTA a la URL firmada de Supabase Storage (PUT), sin
 * pasar por el BFF. Usa la API legacy del filesystem para el uploader
 * binario (uploadAsync está en expo-file-system/legacy desde SDK 54).
 *
 * No lanza NotFoundError de dominio: los fallos de esta fase se propagan
 * como errores crudos y el orquestador decide el mensaje.
 */
export async function subirArchivo(
  urlFirmada: string,
  archivo: Pick<ArchivoAdjunto, 'uri' | 'mimeType'>,
): Promise<void> {
  await uploadAsync(urlFirmada, archivo.uri, {
    httpMethod: 'PUT',
    headers: { 'Content-Type': archivo.mimeType },
    uploadType: 1, // MULTIPART vs BINARY: 1 = binary (PUT directo)
  });
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