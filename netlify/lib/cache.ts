/**
 * Plain in-memory cache in the function's module scope — same idea as
 * kanazawa-masjid's netlify/functions/register.mjs `sessionCache`: no external
 * service (no Redis), just a JS object that survives while the function instance
 * stays warm. Paired with explicit invalidation on writes (see admin.mts) so an
 * admin sees the effect of their own action immediately; TTL is the backstop.
 *
 * Known limitation (same as the reference): Netlify can run several concurrent
 * function instances, each with its own module scope — invalidating in one instance
 * does not reach another. Worst case, a *different* instance serves a stale read for
 * up to TTL_MS after a write made on some other instance. Fine for a low-traffic
 * community site; not a guarantee of strong consistency.
 */

export const DEFAULT_TTL_MS = 6 * 3_600_000; // 6 hours — same as kanazawa-masjid's SESSION_CACHE_TTL

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheDelete(key: string): void {
  store.delete(key);
}

// Shared key builders so a writer (netlify/functions/admin.mts) and a reader
// (stats.mts / laporan.mts / kegiatan.mts) never drift on the string format.
export const cacheKeys = {
  stats: (campaignId: string) => `stats:${campaignId}`,
  laporan: (campaignId: string) => `laporan:${campaignId}`,
  kegiatanList: () => "kegiatan:list",
  settings: () => "settings",
};
