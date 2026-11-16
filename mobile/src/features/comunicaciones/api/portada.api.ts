import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import type { ArchivoAdjunto } from '../api/adjuntos.api';
import { MAX_TAMANO_ADJUNTO_BYTES, TAMANO_MAX_MB } from '../types';

const RECORTE = [3, 2] as [number, number];
const CALIDAD = 0.8;

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
