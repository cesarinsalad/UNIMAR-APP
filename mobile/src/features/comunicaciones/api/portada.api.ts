import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import type { ArchivoAdjunto } from '../api/adjuntos.api';

const RECORTE = [3, 2] as [number, number];
const CALIDAD = 0.8;

/**
 * Abre el selector de portada (galería o cámara, decide la UI) y devuelve
 * el archivo listo para `subirAdjunto` (que pide url de carga con
 * mime/tamaño válidos). null = el usuario canceló.
 *
 * Recorte fijo [3,2] (proporción del banner de la card) y calidad 0.8:
 * normaliza todas las portadas y evita sostesta.Subida de 3 MB por
 * descuido; el límite duro (5 MB) lo aplica el BFF con Zod.
 *
 * Errores: lanza Error con mensaje listo para el usuario si el permiso
 * está denegado (no distingue cámara/librería: el UI lo etiqueta).
 */
export async function seleccionarPortada(desdeCamara: boolean): Promise<ArchivoAdjunto | null> {
  let granted: ImagePicker.PermissionResponse;
  if (desdeCamara) {
    granted = await ImagePicker.requestCameraPermissionsAsync();
  } else {
    granted = await ImagePicker.requestMediaLibraryPermissionsAsync();
  }
  if (!granted.granted) {
    throw new Error(
      desdeCamara
        ? 'Permite el acceso a la cámara para elegir una portada.'
        : 'Permite el acceso a las fotos para elegir una portada.',
    );
  }

  const resultado = desdeCamara
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

  // Pickeles recortados suelen traer fileSize; si no, el filesystem mide.
  let tamano = asset.fileSize ?? 0;
  if (!tamano) {
    const info = await FileSystem.getInfoAsync(asset.uri);
    tamano = info.exists && info.size > 0 ? info.size : 0;
  }

  return {
    uri: asset.uri,
    nombre,
    mimeType: mime,
    tamano,
  };
}
