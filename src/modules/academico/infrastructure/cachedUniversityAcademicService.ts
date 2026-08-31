import { LruCache } from '../../../shared/kernel/lruCache';
import type { IUniversityAcademicService } from '../domain/ports';

/**
 * Decorador que envuelve cualquier `IUniversityAcademicService` con un
 * caché LRU en memoria (TTL 10 min, 500 entradas, stale-if-error).
 *
 * El cacheo se aplica por *clave funcional*: el llamador construye la
 * clave con `claveCacheAcademico(...)` para que distintas combinaciones
 * de parámetros no colisionen.
 *
 * Deuda técnica: caché en proceso. Con varias instancias del BFF, cada
 * una tiene su propio caché (la API externa se llama N veces). Migrar a
 * Redis si la carga crece.
 */
export interface CachedAcademicServiceOptions {
  ttlMs?: number;
  maxEntries?: number;
}

export class CachedUniversityAcademicService implements IUniversityAcademicService {
  private readonly inner: IUniversityAcademicService;
  private readonly cache: LruCache<unknown>;

  constructor(inner: IUniversityAcademicService, options: CachedAcademicServiceOptions = {}) {
    this.inner = inner;
    this.cache = new LruCache<unknown>({
      ttlMs: options.ttlMs ?? 600_000, // 10 minutos
      maxEntries: options.maxEntries ?? 500,
    });
  }

  async perfil(cedula: string) {
    return this.cached(`perfil:${cedula}`, () => this.inner.perfil(cedula));
  }

  async materias(cedula: string, periodo?: string) {
    return this.cached(`materias:${cedula}:${periodo ?? '*'}`, () =>
      this.inner.materias(cedula, periodo),
    );
  }

  async materiaDetalle(cedula: string, materiaId: string) {
    return this.cached(`materiaDetalle:${cedula}:${materiaId}`, () =>
      this.inner.materiaDetalle(cedula, materiaId),
    );
  }

  async pensum(cedula: string, carreraId: string) {
    return this.cached(`pensum:${cedula}:${carreraId}`, () => this.inner.pensum(cedula, carreraId));
  }

  async historialMedico(cedula: string) {
    // NO se cachea por privacidad: si cambia el historial médico, el
    // siguiente request debe verlo de inmediato. El costo de no cachear
    // es bajo (es un endpoint sensible y poco frecuente).
    return this.inner.historialMedico(cedula);
  }

  /**
   * Invalida las entradas del caché que dependen de una cédula. Útil
   * tras eventos que modifican el estado académico del estudiante (p. ej.
   * publicación de nota).
   */
  invalidar(cedula: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(`:${cedula}:`)) this.cache.delete(key);
    }
  }

  private async cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const r = await this.cache.getOrFetch(key, fetcher);
    return r.value as T;
  }
}

/** Helper para construir claves de caché fuera del wrapper (no usado por ahora). */
export function claveCacheAcademico(recurso: string, args: Record<string, string>): string {
  return `academico:${recurso}:${Object.values(args).join(':')}`;
}
