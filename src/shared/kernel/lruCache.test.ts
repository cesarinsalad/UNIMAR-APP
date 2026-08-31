// Tests unitarios del caché LRU (sin dependencias externas, reloj inyectable).

import { describe, expect, it } from 'vitest';
import { LruCache } from './lruCache';

function makeClock(initial: number) {
  let t = initial;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe('LruCache', () => {
  it('hit devuelve el valor cuando está vivo y marca stale=false', async () => {
    const cache = new LruCache<number>({ ttlMs: 1000, maxEntries: 10 });
    cache.set('k', 42);
    const result = await cache.getOrFetch('k', async () => 99);
    expect(result).toEqual({ value: 42, stale: false });
  });

  it('miss llama al fetcher, guarda y marca stale=false', async () => {
    const cache = new LruCache<number>({ ttlMs: 1000, maxEntries: 10 });
    const result = await cache.getOrFetch('k', async () => 7);
    expect(result).toEqual({ value: 7, stale: false });
    expect(cache.get('k')).toBe(7);
  });

  it('stale-if-error: si fetcher rechaza y existe stale, lo devuelve con stale=true', async () => {
    const clock = makeClock(0);
    const cache = new LruCache<number>({ ttlMs: 1000, maxEntries: 10, now: clock.now });
    cache.set('k', 100);

    clock.advance(1500); // expira

    const result = await cache.getOrFetch('k', async () => {
      throw new Error('API caída');
    });
    expect(result).toEqual({ value: 100, stale: true });
  });

  it('stale-if-error: si fetcher rechaza y NO existe stale, propaga el error', async () => {
    const cache = new LruCache<number>({ ttlMs: 1000, maxEntries: 10 });
    await expect(
      cache.getOrFetch('k', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });

  it('hit fresco después de expirar: fetcher se llama de nuevo', async () => {
    const clock = makeClock(0);
    const cache = new LruCache<string>({ ttlMs: 1000, maxEntries: 10, now: clock.now });
    cache.set('k', 'old');

    clock.advance(1500); // expira

    const result = await cache.getOrFetch('k', async () => 'new');
    expect(result).toEqual({ value: 'new', stale: false });
    expect(cache.get('k')).toBe('new');
  });

  it('evicción LRU: descarta la entrada menos usada al exceder maxEntries', () => {
    const cache = new LruCache<number>({ ttlMs: 1000, maxEntries: 3 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    // 'a' es la menos usada; accederla la refresca.
    expect(cache.get('a')).toBe(1);

    // Insertar 'd' debe descartar 'b' (la menos usada ahora).
    cache.set('d', 4);
    expect(cache.get('b')).toBeNull();
    expect(cache.get('a')).toBe(1);
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
  });

  it('actualizar una clave existente no desplaza otras', () => {
    const cache = new LruCache<number>({ ttlMs: 1000, maxEntries: 3 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.set('a', 10); // re-set
    expect(cache.get('a')).toBe(10);
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
    expect(cache.size).toBe(3);
  });

  it('delete elimina la entrada', () => {
    const cache = new LruCache<number>({ ttlMs: 1000, maxEntries: 10 });
    cache.set('k', 1);
    cache.delete('k');
    expect(cache.get('k')).toBeNull();
    expect(cache.peekStale('k')).toBeNull();
  });

  it('clear vacía todo', () => {
    const cache = new LruCache<number>({ ttlMs: 1000, maxEntries: 10 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('TTL expira después del tiempo configurado', () => {
    const clock = makeClock(0);
    const cache = new LruCache<number>({ ttlMs: 500, maxEntries: 10, now: clock.now });
    cache.set('k', 1);
    clock.advance(499);
    expect(cache.get('k')).toBe(1);
    clock.advance(2);
    expect(cache.get('k')).toBeNull();
  });
});
