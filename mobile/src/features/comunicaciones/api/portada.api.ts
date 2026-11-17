import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import type { ArchivoAdjunto } from '../api/adjuntos.api';
import { MAX_TAMANO_ADJUNTO_BYTES, TAMANO_MAX_MB } from '../types';

const RECORTE = [3, 2] as [number, number];
const CALIDAD = 0.8;
const MAX_ANCHO_PORTADA_PX = 1800;

function nombreJpeg(nombreOriginal: string): string {
  const base = nombreOriginal.replace(/\.[^.]+$/, '');
  return `${base || `portada-${Date.now()}`}.jpg`;
}

function cargarImagenWeb(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imagen = document.createElement('img');
    imagen.onload = () => {
      if (imagen.naturalWidth <= 0 || imagen.naturalHeight <= 0) {
        reject(new Error('No se pudo leer la imagen seleccionada. Intenta con otra.'));
        return;
      }
      resolve(imagen);
    };
    imagen.onerror = () => {
      reject(new Error('No se pudo leer la imagen seleccionada. Intenta con otra.'));
    };
    imagen.src = uri;
  });
}

/**
 * En Web `expo-image-picker` ignora `allowsEditing`/`aspect`/`quality`.
 * Recorta a 3:2 centrado, limita la resolución y recodifica a JPEG sRGB
 * para igualar el comportamiento del recortador nativo y rechazar archivos
 * que el navegador no pueda decodificar.
 */
async function normalizarPortadaWeb(
  uri: string,
  nombreOriginal: string,
): Promise<ArchivoAdjunto> {
  try {
    const imagen = await cargarImagenWeb(uri);
    const anchoOrigen = imagen.naturalWidth;
    const altoOrigen = imagen.naturalHeight;
    const ratioObjetivo = RECORTE[0] / RECORTE[1];
    const ratioOrigen = anchoOrigen / altoOrigen;

    let sx = 0;
    let sy = 0;
    let sw = anchoOrigen;
    let sh = altoOrigen;

    if (ratioOrigen > ratioObjetivo) {
      sw = altoOrigen * ratioObjetivo;
      sx = (anchoOrigen - sw) / 2;
    } else if (ratioOrigen < ratioObjetivo) {
      sh = anchoOrigen / ratioObjetivo;
      sy = (altoOrigen - sh) / 2;
    }

    const anchoDestino = Math.min(Math.round(sw), MAX_ANCHO_PORTADA_PX);
    const altoDestino = Math.max(1, Math.round(anchoDestino / ratioObjetivo));

    const canvas = document.createElement('canvas');
    canvas.width = anchoDestino;
    canvas.height = altoDestino;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No se pudo procesar la imagen seleccionada.');
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, anchoDestino, altoDestino);
    ctx.drawImage(imagen, sx, sy, sw, sh, 0, 0, anchoDestino, altoDestino);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', CALIDAD);
    });
    if (!blob || blob.size <= 0) {
      throw new Error('No se pudo leer la imagen seleccionada. Intenta con otra.');
    }

    return {
      uri: URL.createObjectURL(blob),
      nombre: nombreJpeg(nombreOriginal),
      mimeType: 'image/jpeg',
      tamano: blob.size,
    };
  } finally {
    if (uri.startsWith('blob:') && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(uri);
    }
  }
}

/**
 * Abre el selector de portada (galería o cámara, decide la UI) y devuelve
 * el archivo listo para `subirAdjunto` (que pide url de carga con
 * mime/tamaño válidos). null = el usuario canceló.
 *
 * Recorte fijo [3,2] (proporción del banner de la card) y calidad 0.8:
 * normaliza todas las portadas y mantiene el peso bajo. El límite duro
 * (5 MB, espejo de `solicitarUrlCargaSchema`) se valida aquí antes de pedir
 * la URL firmada, para no depender de un 400 del BFF ni enviar un archivo que
 * Storage rechazaría a mitad del flujo.
 *
 * Errores: lanza Error con mensaje listo para el usuario si el permiso
 * está denegado (no distingue cámara/librería: el UI lo etiqueta), si el
 * formato no es PNG/JPEG o si el tamaño no es utilizable.
 */
export async function seleccionarPortada(desdeCamara: boolean): Promise<ArchivoAdjunto | null> {
  // La cámara no existe en web (launchCameraAsync no está implementada):
  // la UI web solo ofrece galería; el guard es defensa en profundidad.
  const usarCamara = desdeCamara && Platform.OS !== 'web';
  let granted: ImagePicker.PermissionResponse;
  if (usarCamara) {
    granted = await ImagePicker.requestCameraPermissionsAsync();
  } else {
    granted = await ImagePicker.requestMediaLibraryPermissionsAsync();
  }
  if (!granted.granted) {
    throw new Error(
      usarCamara
        ? 'Permite el acceso a la cámara para elegir una portada.'
        : 'Permite el acceso a las fotos para elegir una portada.',
    );
  }

  const resultado = usarCamara
    ? await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: RECORTE,
        quality: CALIDAD,
      })
    : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: RECORTE,
        quality: CALIDAD,
      });

  if (resultado.canceled || resultado.assets.length === 0) return null;
  const asset = resultado.assets[0]!;

  const mime = asset.mimeType ?? 'image/jpeg';
  if (mime !== 'image/jpeg' && mime !== 'image/png') {
    throw new Error('La portada debe ser una imagen PNG o JPEG.');
  }
  const extension = mime === 'image/png' ? 'png' : 'jpg';
  const nombre = asset.fileName ?? `portada-${Date.now()}.${extension}`;

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const normalizada = await normalizarPortadaWeb(asset.uri, nombre);
    if (normalizada.tamano > MAX_TAMANO_ADJUNTO_BYTES) {
      if (normalizada.uri.startsWith('blob:') && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(normalizada.uri);
      }
      throw new Error(`La portada no puede superar ${TAMANO_MAX_MB} MB.`);
    }
    return normalizada;
  }

  // Pickers recortados suelen traer fileSize; si no, el filesystem mide en
  // nativo y el blob mide en web (getInfoAsync es shim vacío en web).
  let tamano = asset.fileSize ?? 0;
  if (!tamano) {
    if (Platform.OS === 'web') {
      tamano = await fetch(asset.uri)
        .then((r) => r.blob())
        .then((b) => b.size);
    } else {
      const info = await FileSystem.getInfoAsync(asset.uri);
      tamano = info.exists && info.size > 0 ? info.size : 0;
    }
  }

  // Fail-fast en cliente (espejo de solicitarUrlCargaSchema): un tamaño 0 o
  // sobre el límite no debe llegar ni a la firma de la URL.
  if (tamano <= 0) {
    throw new Error('No se pudo leer la imagen seleccionada. Intenta con otra.');
  }
  if (tamano > MAX_TAMANO_ADJUNTO_BYTES) {
    throw new Error(`La portada no puede superar ${TAMANO_MAX_MB} MB.`);
  }

  return {
    uri: asset.uri,
    nombre,
    mimeType: mime,
    tamano,
  };
}
