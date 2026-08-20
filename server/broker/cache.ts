/**
 * Broker-data cache — used by the Bandarmology precompute (Vercel Cron) and
 * the on-demand API handlers.
 *
 * Prefers Vercel KV when the store is attached (KV_REST_API_URL + token are
 * auto-injected by Vercel); otherwise falls back to an in-memory store so
 * local dev and KV-less deployments keep working. The memory fallback is
 * per-instance — the cron precompute only becomes durable once a KV store is
 * attached to the project.
 */
import { createClient, type VercelKV } from "@vercel/kv";

export interface BrokerCacheStore {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
}

// ── memory store (local dev / no-KV deployments) ─────────────────────────

class MemoryStore implements BrokerCacheStore {
  private map = new Map<string, { value: unknown; expires: number }>();

  async get<T>(key: string): Promise<T | null> {
    const hit = this.map.get(key);
    if (!hit) return null;
    if (hit.expires < Date.now()) {
      this.map.delete(key);
      return null;
    }
    return hit.value as T;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    this.map.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  }
}

// ── KV store (production on Vercel with a KV database attached) ──────────

class KvStore implements BrokerCacheStore {
  private kv: VercelKV;
  constructor() {
    this.kv = createClient({
      url: process.env.KV_REST_API_URL ?? "",
      token: process.env.KV_REST_API_TOKEN ?? "",
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      return (await this.kv.get<T>(key)) ?? null;
    } catch (err) {
      console.error("[broker/cache] kv get failed:", err);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.kv.set(key, value, { ex: ttlSeconds });
    } catch (err) {
      console.error("[broker/cache] kv set failed:", err);
    }
  }
}

function resolveStore(): BrokerCacheStore {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return new KvStore();
  }
  return new MemoryStore();
}

let store: BrokerCacheStore | null = null;

export function brokerCache(): BrokerCacheStore {
  if (!store) store = resolveStore();
  return store;
}
