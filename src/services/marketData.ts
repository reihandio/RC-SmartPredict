/**
 * Market-data abstraction — the UI only talks to this provider.
 * Implementation fetches normalized JSON from the app's own Vercel API
 * (`/api/*`), which proxies Yahoo Finance server-side. The frontend never
 * depends on Yahoo implementation details.
 *
 * A small in-memory TTL cache avoids re-requesting the same data when
 * navigating between pages.
 */
import type {
  CorporateAction,
  MarketOverview,
  PriceData,
  ScoredStock,
  StockDetail,
  TimeRange,
} from "../types";

export interface MarketDataProvider {
  getMarketOverview(): Promise<MarketOverview>;
  getUniverse(): Promise<{ stocks: ScoredStock[]; updatedAt: string }>;
  getStockDetail(ticker: string): Promise<{
    stock: StockDetail;
    actions: CorporateAction[];
    updatedAt: string;
  }>;
  getHistoricalPrices(ticker: string, range: TimeRange): Promise<PriceData[]>;
  getEvents(): Promise<{ actions: CorporateAction[]; updatedAt: string }>;
}

// ── tiny TTL cache (per session) ────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  at: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

async function cachedFetch<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.data as T;
  const data = await fn();
  cache.set(key, { data, at: Date.now(), ttl: ttlMs });
  return data;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path);
  const body = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok || body.error) {
    throw new Error(body.error ?? "Unable to retrieve market data.");
  }
  return body;
}

const QUOTE_TTL = 60 * 1000; // quotes/overview: 1 min
const UNIVERSE_TTL = 60 * 1000;
const HISTORY_TTL = 10 * 60 * 1000; // charts rarely change
const EVENTS_TTL = 30 * 60 * 1000;

/** Real-data provider backed by the app's Vercel API. */
export class ApiMarketDataProvider implements MarketDataProvider {
  async getMarketOverview(): Promise<MarketOverview> {
    const body = await cachedFetch("overview", QUOTE_TTL, () =>
      apiGet<{ overview: MarketOverview }>("/api/overview"),
    );
    return body.overview;
  }

  async getUniverse(): Promise<{ stocks: ScoredStock[]; updatedAt: string }> {
    return cachedFetch("universe", UNIVERSE_TTL, () =>
      apiGet<{ stocks: ScoredStock[]; updatedAt: string }>("/api/universe"),
    );
  }

  async getStockDetail(ticker: string): Promise<{
    stock: StockDetail;
    actions: CorporateAction[];
    updatedAt: string;
  }> {
    const t = ticker.toUpperCase();
    return cachedFetch(`stock:${t}`, QUOTE_TTL, () =>
      apiGet<{ stock: StockDetail; actions: CorporateAction[]; updatedAt: string }>(
        `/api/stocks/${encodeURIComponent(t)}`,
      ),
    );
  }

  async getHistoricalPrices(ticker: string, range: TimeRange): Promise<PriceData[]> {
    const t = ticker.toUpperCase();
    const body = await cachedFetch(
      `history:${t}:${range}`,
      range === "1D" || range === "1W" ? 5 * 60 * 1000 : HISTORY_TTL,
      () =>
        apiGet<{ bars: PriceData[]; updatedAt: string }>(
          `/api/history/${encodeURIComponent(t)}?range=${range}`,
        ),
    );
    return body.bars;
  }

  async getEvents(): Promise<{ actions: CorporateAction[]; updatedAt: string }> {
    return cachedFetch("events", EVENTS_TTL, () =>
      apiGet<{ actions: CorporateAction[]; updatedAt: string }>("/api/events"),
    );
  }
}

/** Singleton provider used by the app. */
export const marketDataProvider: MarketDataProvider = new ApiMarketDataProvider();
