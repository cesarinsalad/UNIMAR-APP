import { StorageClient } from '@supabase/storage-js';
import type { IStorageService } from '../domain/ports';

interface SupabaseStorageDeps {
  /** URL base de Supabase (p.ej. http://127.0.0.1:54321), sin /storage/v1 */
  url: string;
  serviceRoleKey: string;
  bucket: string;
}

function throwIfError(prefix: string, error: { message: string } | null): void {
  if (error) {
    throw new Error(`${prefix}: ${error.message}`);
  }
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

  constructor(deps: SupabaseStorageDeps) {
    this.client = new StorageClient(`${deps.url}/storage/v1`, {
      Authorization: `Bearer ${deps.serviceRoleKey}`,
    });
    this.bucket = deps.bucket;
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
      urlFirmada: data.signedUrl,
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
    return data.signedUrl;
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
