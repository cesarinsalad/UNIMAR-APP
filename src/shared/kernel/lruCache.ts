/**
 * Caché LRU en memoria con TTL y `stale-if-error` (shared kernel, Paso 5).
 *
 * Inspirado en la decisión arquitectónica de `ARCHITECTURE.md §3.4` para el
 * módulo Académico: reducir la carga sobre la API de UNIMAR y mantener la
 * app móvil usable aunque la API externa caiga temporalmente.
 *
 * Comportamiento:
 *  - **Hit fresco**: la entrada existe y no expiró (timestamp + TTL).
 *  - **Miss**: la entrada no existe o ya expiró. Se llama al `fetcher`.
 *  - **`stale-if-error`**: si el `fetcher` rechaza y existe una entrada
 *    expirada, se devuelve esa entrada con la bandera `stale: true`. Si no
 *    hay stale, el error se propaga al caller.
 *
 * Política de evicción: LRU por inserción. Al exceder `maxEntries`, se
 * descarta la entrada menos recientemente usada (lectura o escritura).
 *
 * Deuda técnica: es un caché en proceso. Con múltiples instancias del BFF,
 * cada una mantiene su propio caché. Se migra a Redis si la cardinalidad
 * de usuarios crece.
 */
export interface CacheEntry<V> {
  value: V;
  insertedAt: number;
}

export interface GetOrFetchResult<V> {
  value: V;
  /** `false` cuando el valor se obtuvo fresco en este llamado. */
  stale: boolean;
}

export interface LruCacheOptions {
  /** Tiempo de vida de una entrada en milisegundos. */
  ttlMs: number;
  /** Máximo de entradas antes de descartar la menos usada. */
  maxEntries: number;
  /** Reloj inyectable (útil para tests deterministas). Por defecto: Date.now. */
  now?: () => number;
}

export class LruCache<V> {
  private readonly store = new Map<string, CacheEntry<V>>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly now: () => number;

  constructor(options: LruCacheOptions) {
    this.ttlMs = options.ttlMs;
    this.maxEntries = options.maxEntries;
    this.now = options.now ?? Date.now;
  }

  /** Tamaño actual del caché (entradas vivas y expiradas). */
  get size(): number {
    return this.store.size;
  }

  /** Devuelve el valor si existe y no ha expirado; `null` en caso contrario. */
  get(key: string): V | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (this.now() - entry.insertedAt >= this.ttlMs) return null;
    // Hit fresco: refrescamos el orden LRU reinsertando.
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  /** Devuelve el valor aunque haya expirado (para stale-if-error). `null` si no existe. */
  peekStale(key: string): V | null {
    const entry = this.store.get(key);
    return entry ? entry.value : null;
  }

  /** Inserta/actualiza una entrada respetando el límite LRU. */
  set(key: string, value: V): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      // Map preserva orden de inserción; el primer key es el menos usado.
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }
    this.store.set(key, { value, insertedAt: this.now() });
  }

  /** Elimina una entrada explícitamente (p. ej. tras una publicación de nota). */
  delete(key: string): void {
    this.store.delete(key);
  }

  /** Itera sobre las claves (orden LRU: de menos a más recientemente usada). */
  keys(): IterableIterator<string> {
    return this.store.keys();
  }

  /** Vacía todo el caché. Útil para tests y para endpoint admin de reset. */
  clear(): void {
    this.store.clear();
  }

  /**
   * Busca una clave; si falta o expiró, llama al fetcher. Si el fetcher
   * rechaza y existe una entrada expirada, devuelve esa con `stale: true`.
   */
  async getOrFetch(
    key: string,
    fetcher: () => Promise<V>,
  ): Promise<GetOrFetchResult<V>> {
    const fresh = this.get(key);
    if (fresh !== null) {
      return { value: fresh, stale: false };
    }

    try {
      const value = await fetcher();
      this.set(key, value);
      return { value, stale: false };
    } catch (err) {
      const stale = this.peekStale(key);
      if (stale !== null) {
        return { value: stale, stale: true };
      }
      throw err;
    }
  }
}
