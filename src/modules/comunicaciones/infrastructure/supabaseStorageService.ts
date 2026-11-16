import { StorageClient } from '@supabase/storage-js';
import type { IStorageService } from '../domain/ports';

interface SupabaseStorageDeps {
  /** URL base de Supabase (p.ej. http://127.0.0.1:54321), sin /storage/v1 */
  url: string;
  /**
   * Origen público que se usa en las URLs firmadas devueltas al cliente.
   * Ausente = se devuelve la URL tal cual (Supabase Cloud ya es público).
   */
  publicUrl?: string;
  serviceRoleKey: string;
  bucket: string;
}

function throwIfError(prefix: string, error: { message: string } | null): void {
  if (error) {
    throw new Error(`${prefix}: ${error.message}`);
  }
}

/**
 * Reemplaza el origen de una URL firmada por la base pública configurada.
 *
 * El token firmado de Storage solo cubre `bucket/path` (no el host), así que
 * cambiar el origen no invalida la firma: sirve para que un cliente que no
 * alcanza la URL interna (p. ej. `127.0.0.1` en dev) use el gateway del BFF.
 * `publicBase` es un origen (protocolo + host); se conservan el path y el
 * `?token=` de la URL firmada.
 */
export function publicarUrlFirmada(
  urlFirmada: string,
  publicBase: string | undefined,
): string {
  if (!publicBase) return urlFirmada;
  const firmada = new URL(urlFirmada);
  // Se parte de la base pública (origen sin path) y se le pega el path+query
  // firmados. Asignar `host` por separado conservaría el puerto interno.
  const publica = new URL(publicBase);
  publica.pathname = firmada.pathname;
  publica.search = firmada.search;
  return publica.toString();
}

/**
 * Adapter de Storage usando Supabase Storage.
 *
 * El BFF se autentica con la service-role key, por eso puede generar URLs
 * firmadas y listar/eliminar objetos independientemente de las políticas de
 * Storage. El cliente móvil solo ve las URLs firmadas (fail-closed).
 */
export class SupabaseStorageService implements IStorageService {
  private readonly client: StorageClient;
  private readonly bucket: string;
  private readonly publicUrl?: string;

  constructor(deps: SupabaseStorageDeps) {
    this.client = new StorageClient(`${deps.url}/storage/v1`, {
      Authorization: `Bearer ${deps.serviceRoleKey}`,
    });
    this.bucket = deps.bucket;
    this.publicUrl = deps.publicUrl;
  }

  async crearUrlCargaFirmada(
    path: string,
  ): Promise<{ urlFirmada: string; token: string; path: string }> {
    const { data, error } = await this.client.from(this.bucket).createSignedUploadUrl(path);
    throwIfError('Error al crear URL de carga firmada', error);
    if (!data) {
      throw new Error('No se recibió URL de carga firmada');
    }
    return {
      urlFirmada: publicarUrlFirmada(data.signedUrl, this.publicUrl),
      token: data.token,
      path: data.path,
    };
  }

  async crearUrlDescargaFirmada(path: string, expiraSegundos: number): Promise<string> {
    const { data, error } = await this.client
      .from(this.bucket)
      .createSignedUrl(path, expiraSegundos);
    throwIfError('Error al crear URL de descarga firmada', error);
    if (!data?.signedUrl) {
      throw new Error('No se recibió URL de descarga firmada');
    }
    return publicarUrlFirmada(data.signedUrl, this.publicUrl);
  }

  async existeObjeto(path: string): Promise<boolean> {
    const { data, error } = await this.client.from(this.bucket).exists(path);
    if (error) {
      // Un objeto inexistente no es un error de infraestructura.
      if (typeof error.message === 'string' && /not found|no such/i.test(error.message)) {
        return false;
      }
      throw new Error(`Error al verificar existencia del objeto: ${error.message}`);
    }
    return data === true;
  }

  async eliminarObjeto(path: string): Promise<void> {
    const { error } = await this.client.from(this.bucket).remove([path]);
    throwIfError('Error al eliminar objeto de Storage', error);
  }
}
