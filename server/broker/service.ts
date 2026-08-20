/**
 * BrokerDataProvider (Section 13a) — live Bandarmology service.
 *
 * Data source: IndoPremier broker-summary module (server/broker/ipotSource.ts,
 * unofficial — see its header). Aggregates the 7D / 14D / 30D windows, scores
 * Tier A/B/C server-side, and persists results through the broker cache
 * (Vercel KV when attached, in-memory otherwise).
 *
 * Two usage paths:
 *  - on-demand:  /api/broker-summary/[ticker]  → getBrokerSummary(ticker)
 *  - precomputed: /api/cron/broker-radar (Vercel Cron, ONCE daily on the
 *    Hobby plan) → refreshRadarSlice(), and /api/broker-radar →
 *    getBrokerRadar() which serves cached entries, synchronously fills a
 *    small number of missing ones, and background-refreshes a bounded number
 *    of stale ones (stale-while-revalidate — see the SWR constants below).
 */
import type {
  BrokerAccumulationSummary,
  BrokerWindowRange,
} from "../../src/types/index.js";
import { WATCHLIST } from "../watchlist.js";
import { getQuote } from "../yahoo.js";
import { brokerCache } from "./cache.js";
import { fetchBrokerWindow, type IpotResult } from "./ipotSource.js";
import { buildBrokerAccumulationSummary, buildWindow } from "./scoring.js";

const SUMMARY_TTL_SECONDS = 6 * 60 * 60; // 6 h — Bandarmology windows move daily
const STALE_AFTER_MS = 24 * 60 * 60 * 1000; // radar shows "stale" beyond 24 h

// Stale-while-revalidate (SWR) horizons — cron on the Vercel Hobby plan is
// limited to ONE run per day, so on-demand requests carry freshness between
// cron runs:
//  · age < FRESH:                serve as-is
//  · FRESH ≤ age < MAX_STALE:    serve immediately + refresh in background
//  · age ≥ MAX_STALE:            too old to serve — recompute synchronously
const SUMMARY_FRESH_MS = SUMMARY_TTL_SECONDS * 1000;
const SUMMARY_MAX_STALE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const SUMMARY_RETENTION_SECONDS = 4 * 24 * 60 * 60; // KV key lives 4 days (≥ max stale)
/** Per-request cap on background refreshes so a radar page load can never
 *  turn into a per-minute-cron-style scrape storm. */
const MAX_STALE_REFRESHES_PER_REQUEST = 6;
const INDEX_KEY = "broker:index";
const sumKey = (ticker: string) => `broker:summary:${ticker.toUpperCase()}`;

const ageMs = (iso: string): number => Date.now() - new Date(iso).getTime();

// ── date helpers ─────────────────────────────────────────────────────────

/** Latest completed trading day (WIB): after ~16:45 WIB today counts, else yesterday. */
function latestTradingDay(): Date {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const hours = wib.getUTCHours() + wib.getUTCMinutes() / 60;
  const d = new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()));
  if (hours < 16.75) d.setUTCDate(d.getUTCDate() - 1);
  // step back over weekends (crude; holidays are handled by the source itself)
  const dow = d.getUTCDay();
  if (dow === 0) d.setUTCDate(d.getUTCDate() - 2);
  else if (dow === 6) d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

// ── quote helper (small local TTL) ───────────────────────────────────────

const quoteCache = new Map<string, { at: number; marketCap: number }>();
async function marketCapOf(ticker: string): Promise<number> {
  const symbol = `${ticker.toUpperCase()}.JK`;
  const hit = quoteCache.get(symbol);
  if (hit && Date.now() - hit.at < 60 * 60 * 1000) return hit.marketCap;
  try {
    const q = await getQuote(symbol);
    const mc = q?.marketCap ?? 0;
    quoteCache.set(symbol, { at: Date.now(), marketCap: mc });
    return mc;
  } catch {
    return 0;
  }
}

// ── single-ticker computation ────────────────────────────────────────────

async function fetchWindows(
  ticker: string,
  endDate: Date,
): Promise<{ range: BrokerWindowRange; raw: IpotResult }[]> {
  const ranges: BrokerWindowRange[] = ["7D", "14D", "30D"];
  // concurrency 2: gentle with the unofficial source
  const out: { range: BrokerWindowRange; raw: IpotResult }[] = [];
  for (let i = 0; i < ranges.length; i += 2) {
    const batch = ranges.slice(i, i + 2);
    const results = await Promise.all(
      batch.map(async (range) => ({ range, raw: await fetchBrokerWindow(ticker, range, endDate) })),
    );
    out.push(...results);
    if (i + 2 < ranges.length) await new Promise((r) => setTimeout(r, 300));
  }
  return out;
}

async function computeSummary(
  ticker: string,
  endDate: Date,
): Promise<BrokerAccumulationSummary | null> {
  const marketCap = await marketCapOf(ticker);
  const windows = await fetchWindows(ticker, endDate);

  const built = windows
    .filter((w): w is { range: BrokerWindowRange; raw: Extract<IpotResult, { ok: true }> } => w.raw.ok)
    .map((w) => buildWindow(w.range, w.raw.data, marketCap));

  if (built.length < 3) {
    const failed = windows
      .map((w) => `${w.range}:${w.raw.ok ? "ok" : w.raw.reason}`)
      .filter((s) => !s.endsWith(":ok"))
      .join(", ");
    console.warn(`[broker] ${ticker}: incomplete windows (${failed})`);
    return null;
  }

  return buildBrokerAccumulationSummary({
    ticker: ticker.toUpperCase(),
    windows: built,
    updatedAt: new Date().toISOString(),
  });
}

// ── public API ───────────────────────────────────────────────────────────

/**
 * Cache-only read (no compute): used by the stock-detail path to cross-
 * reference volume authenticity without slowing the response down. Null when
 * the summary has not been precomputed yet.
 */
export async function getCachedBrokerSummary(
  ticker: string,
): Promise<BrokerAccumulationSummary | null> {
  const store = brokerCache();
  return store.get<BrokerAccumulationSummary>(sumKey(ticker.toUpperCase()));
}

// ── stale-while-revalidate (SWR) ─────────────────────────────────────────

// In-flight refreshes per ticker (per warm instance) — dedupes concurrent
// requests so a stale ticker is scraped at most once at a time.
const inflightRefreshes = new Map<string, Promise<void>>();

/** Start (or join) a background refresh for one ticker. Never rejects;
 *  returns a promise that resolves when the refresh finishes so callers on
 *  Vercel can keep it alive with waitUntil after responding. */
export function scheduleBrokerRefresh(ticker: string): Promise<void> {
  const t = ticker.toUpperCase();
  const existing = inflightRefreshes.get(t);
  if (existing) return existing;

  const p = (async () => {
    try {
      const summary = await computeSummary(t, latestTradingDay());
      if (summary) {
        await brokerCache().set(sumKey(t), summary, SUMMARY_RETENTION_SECONDS);
        await touchIndex(t);
      }
    } catch (err) {
      console.error(`[broker] background refresh failed for ${t}:`, err);
    }
  })().finally(() => inflightRefreshes.delete(t));
  inflightRefreshes.set(t, p);
  return p;
}

export interface BrokerSummaryResult {
  summary: BrokerAccumulationSummary | null;
  /** Settled by the background refresh started because the served summary
   *  was stale (SWR). Undefined when nothing was scheduled. */
  refresh?: Promise<void>;
}

/**
 * On-demand summary for one ticker (Stock Detail tab).
 * SWR: ≤ 6 h old is served as-is; 6 h–3 days old is served immediately with
 * a background refresh; older or missing is recomputed synchronously.
 */
export async function getBrokerSummary(
  ticker: string,
): Promise<BrokerSummaryResult> {
  const t = ticker.toUpperCase();
  const store = brokerCache();
  const hit = await store.get<BrokerAccumulationSummary>(sumKey(t));
  if (hit) {
    const age = ageMs(hit.updatedAt);
    if (age < SUMMARY_FRESH_MS) return { summary: hit };
    if (age < SUMMARY_MAX_STALE_MS) {
      return { summary: hit, refresh: scheduleBrokerRefresh(t) };
    }
    // fall through: too old to serve — recompute synchronously
  }

  const summary = await computeSummary(t, latestTradingDay());
  if (summary) {
    await store.set(sumKey(t), summary, SUMMARY_RETENTION_SECONDS);
    await touchIndex(t);
    return { summary };
  }
  if (hit) {
    // source temporarily unavailable — keep serving the stale copy and retry
    // in the background rather than showing an error for old-but-real data
    return { summary: hit, refresh: scheduleBrokerRefresh(t) };
  }
  return { summary: null };
}

// ── radar index (last-refresh bookkeeping) ───────────────────────────────

async function readIndex(): Promise<Record<string, number>> {
  const store = brokerCache();
  const idx = await store.get<Record<string, number>>(INDEX_KEY);
  return idx ?? {};
}

async function touchIndex(ticker: string): Promise<void> {
  const store = brokerCache();
  const idx = await readIndex();
  idx[ticker] = Date.now();
  await store.set(INDEX_KEY, idx, 30 * 24 * 60 * 60);
}

export interface BrokerRadarEntry {
  summary: BrokerAccumulationSummary | null;
  status: "FRESH" | "STALE" | "PENDING";
}

/**
 * Cached radar over the whole watchlist. PENDING tickers (no cached summary
 * yet) are filled synchronously in a bounded number so the request stays
 * fast; STALE ones are served as-is (SWR) with a bounded number of
 * background refreshes — a page load must never turn into a scrape storm.
 */
export async function getBrokerRadar(maxFill = 6): Promise<{
  entries: Array<{ ticker: string } & BrokerRadarEntry>;
  updatedAt: string;
  refresh?: Promise<void>;
}> {
  const store = brokerCache();
  const tickers = WATCHLIST.map((s) => s.replace(/\.JK$/i, ""));
  const entries: ({ ticker: string } & BrokerRadarEntry)[] = [];

  for (const t of tickers) {
    const summary = await store.get<BrokerAccumulationSummary>(sumKey(t));
    if (!summary) {
      entries.push({ ticker: t, summary: null, status: "PENDING" });
      continue;
    }
    const age = ageMs(summary.updatedAt);
    entries.push({
      ticker: t,
      summary,
      status: age < STALE_AFTER_MS ? "FRESH" : "STALE",
    });
  }

  // missing entries have nothing to serve — fill a bounded few synchronously
  const toFill = entries.filter((e) => e.status === "PENDING").slice(0, maxFill);
  if (toFill.length > 0) {
    await fillTickers(toFill.map((e) => e.ticker), 2);
    for (const e of toFill) {
      const summary = await store.get<BrokerAccumulationSummary>(sumKey(e.ticker));
      if (summary) {
        e.summary = summary;
        e.status = "FRESH";
      }
    }
  }

  // stale entries: serve + background-refresh, oldest first, bounded
  const toRefresh = entries
    .filter((e): e is { ticker: string } & BrokerRadarEntry & { summary: BrokerAccumulationSummary } =>
      e.status === "STALE" && e.summary !== null,
    )
    .sort((a, b) => a.summary.updatedAt.localeCompare(b.summary.updatedAt))
    .slice(0, MAX_STALE_REFRESHES_PER_REQUEST);
  const refresh =
    toRefresh.length > 0
      ? Promise.allSettled(toRefresh.map((e) => scheduleBrokerRefresh(e.ticker))).then(
          () => undefined,
        )
      : undefined;

  // honest freshness: newest summary computation time across entries, not "now"
  const newest = entries.reduce<string | null>(
    (max, e) => (e.summary && (max === null || e.summary.updatedAt > max) ? e.summary.updatedAt : max),
    null,
  );

  return { entries, updatedAt: newest ?? new Date().toISOString(), refresh };
}

/** Fill (or refresh) a batch of tickers with bounded concurrency. */
export async function fillBrokerTickers(tickers: string[], concurrency: number): Promise<void> {
  return fillTickers(tickers, concurrency);
}

async function fillTickers(tickers: string[], concurrency: number): Promise<void> {
  const endDate = latestTradingDay();
  const store = brokerCache();
  const queue = [...tickers];
  async function worker() {
    while (queue.length > 0) {
      const t = queue.shift()!;
      try {
        const summary = await computeSummary(t, endDate);
        if (summary) {
          await store.set(sumKey(t), summary, SUMMARY_RETENTION_SECONDS);
          await touchIndex(t);
        }
      } catch (err) {
        console.error(`[broker] radar fill failed for ${t}:`, err);
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tickers.length) }, worker));
}

/**
 * Cron entry point: refresh the N oldest-cached tickers (rotating coverage).
 * The cron now runs only ONCE per day (Vercel Hobby limit), so the batch is
 * sized to make a full watchlist rotation in roughly a week while staying
 * inside the 60 s function budget — on-demand SWR carries the rest.
 */
export async function refreshRadarSlice(batchSize = 10): Promise<{ refreshed: string[] }> {
  const store = brokerCache();
  const tickers = WATCHLIST.map((s) => s.replace(/\.JK$/i, ""));
  const idx = await readIndex();

  const ordered = [...tickers].sort(
    (a, b) => (idx[a] ?? 0) - (idx[b] ?? 0), // oldest first
  );
  const slice = ordered.slice(0, batchSize);

  await fillTickers(slice, 2);

  // report only tickers that actually got a fresh summary
  const refreshed: string[] = [];
  for (const t of slice) {
    const s = await store.get<BrokerAccumulationSummary>(sumKey(t));
    if (s && ageMs(s.updatedAt) < SUMMARY_FRESH_MS) {
      refreshed.push(t);
    }
  }
  return { refreshed };
}
