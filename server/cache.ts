/**
 * Shared in-memory TTL cache with stale-while-revalidate — the generic cache
 * layer used by the universe/overview/events handlers and the corporate
 * action feed (Section 25: on-demand fetch + SWR instead of extra cron jobs).
 *
 * Extracted from universe.ts so other server modules can reuse it.
 */
interface CacheEntry<T> {
  data: T;
  at: number; // ms timestamp of the fetch that produced `data`
  expires: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
// in-flight background refreshes per key — dedupes a burst of stale reads so
// N requests on a stale key trigger ONE refresh, not N (stampede guard).
const inflight = new Map<string, Promise<void>>();

/**
 * Stale-while-revalidate cache: fresh entries are served as-is; stale ones
 * are served immediately (the user never waits or errors on a slow upstream)
 * while ONE background refresh updates the cache for the next request. The
 * refresh runs in-process — on Vercel a warm instance may be frozen right
 * after responding, so the refresh is best-effort here (unlike the broker
 * cache, whose refresh is kept alive via waitUntil); a cold instance simply
 * recomputes.
 */
export async function cached<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.data as T;
  if (hit && hit.expires <= now) {
    if (!inflight.has(key)) {
      const p = compute()
        .then((data) => {
          const done = Date.now();
          cache.set(key, { data, at: done, expires: done + ttlMs });
        })
        .catch(() => undefined) // keep serving stale; retry on a later request
        .finally(() => inflight.delete(key));
      inflight.set(key, p);
    }
    return hit.data as T;
  }
  const data = await compute();
  cache.set(key, { data, at: now, expires: now + ttlMs });
  return data;
}
