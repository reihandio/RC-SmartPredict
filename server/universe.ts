/**
 * Scored-universe orchestrator — batch quotes for the watchlist, fetch each
 * stock's recent daily history (concurrency-limited), and derive all scores
 * from real data. Results are cached in-memory per serverless instance with
 * stale-while-revalidate.
 */
import type { CorporateAction, MarketOverview, ScoredStock, StockDetail } from "../src/types/index.js";
import { IHSG_SYMBOL, WATCHLIST } from "./watchlist.js";
import { getDailyHistory, getFundamentals, getHistory, getQuote, getQuotes } from "./yahoo.js";
import type { YahooChart } from "./yahoo.js";
import {
  buildStockDetail,
  corporateActionsFromEvents,
  pctReturn,
  scoreStock,
} from "./analytics.js";
import { volumeAuthenticity } from "./volumeAuthenticity.js";
import { getCachedBrokerSummary } from "./broker/service.js";
import { cached } from "./cache.js";
import { getCorporateActionsFeed } from "./corporateActions/service.js";

// ── tiny in-memory TTL cache (per warm instance) — see server/cache.ts ──

/** Run an async map with a concurrency limit (gentle with the provider). */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: Array<R | null> = new Array(items.length).fill(null);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        out[i] = await fn(items[i]);
      } catch {
        out[i] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out.filter((v): v is R => v !== null);
}

const UNIVERSE_TTL = 30 * 60 * 1000; // 30 min
const OVERVIEW_TTL = 60 * 1000; // 1 min (IHSG + breadth refresh more often)
const EVENTS_TTL = 60 * 60 * 1000; // 1 h

// ── universe scoring ────────────────────────────────────────────────────

async function computeIhsg20dReturn(): Promise<number | null> {
  const c = await getDailyHistory(IHSG_SYMBOL, 30, false);
  return pctReturn(c.bars.map((b) => b.close), 20);
}

async function computeUniverse(): Promise<{ stocks: ScoredStock[]; updatedAt: string }> {
  const quotes = await getQuotes(WATCHLIST);
  const ihsg20d = await computeIhsg20dReturn();

  const scored = await mapLimit(quotes, 6, async (q) => {
    const chart = await getDailyHistory(q.symbol, 80, true);
    if (chart.bars.length < 22) return null;
    // cache-only broker read: consistent VA cross-reference without slow scrapes
    const broker = await getCachedBrokerSummary(q.symbol.replace(/\.JK$/i, "")).catch(() => null);
    return scoreStock(q, chart, ihsg20d, broker ? { score: broker.score, tier: broker.tier } : null);
  });

  const updatedAt = quotes.reduce(
    (max, q) => (q.updatedAt > max ? q.updatedAt : max),
    quotes[0]?.updatedAt ?? new Date().toISOString(),
  );

  // keep only stocks whose scoring succeeded
  const valid = scored.filter((s): s is ScoredStock => s !== null);
  return { stocks: valid, updatedAt };
}

export function getScoredUniverse(): Promise<{ stocks: ScoredStock[]; updatedAt: string }> {
  return cached("universe", UNIVERSE_TTL, computeUniverse);
}

// ── market overview ─────────────────────────────────────────────────────

async function computeOverview(): Promise<MarketOverview> {
  const [ihsg, universe] = await Promise.all([
    getQuote(IHSG_SYMBOL),
    getScoredUniverse(),
  ]);

  const advancing = universe.stocks.filter((s) => s.changePercent > 0.05).length;
  const declining = universe.stocks.filter((s) => s.changePercent < -0.05).length;
  const unchanged = universe.stocks.length - advancing - declining;

  let spark: number[] = [];
  try {
    const c = await getDailyHistory(IHSG_SYMBOL, 30, false);
    spark = c.bars.slice(-30).map((b) => Math.round(b.close * 100) / 100);
  } catch {
    spark = [];
  }

  const totalVolume = universe.stocks.reduce((x, s) => x + s.volume, 0);
  const totalValue = universe.stocks.reduce((x, s) => x + s.volume * s.price, 0);

  const ihsgValue = ihsg?.price ?? 0;
  const ihsgPrev = ihsg?.prevClose ?? 0;
  const ihsgChange = ihsgValue - ihsgPrev;

  return {
    ihsgValue: Math.round(ihsgValue * 100) / 100,
    ihsgChange: Math.round(ihsgChange * 100) / 100,
    ihsgChangePercent: ihsgPrev > 0 ? Math.round(((ihsgChange / ihsgPrev) * 100) * 100) / 100 : 0,
    advancing,
    declining,
    unchanged,
    universeSize: universe.stocks.length,
    totalVolume,
    totalValue,
    spark,
    updatedAt: universe.updatedAt,
  };
}

export function getMarketOverview(): Promise<MarketOverview> {
  return cached("overview", OVERVIEW_TTL, computeOverview);
}

// ── single stock detail ─────────────────────────────────────────────────

async function computeStockDetail(ticker: string) {
  const symbol = ticker.toUpperCase().endsWith(".JK") ? ticker.toUpperCase() : `${ticker.toUpperCase()}.JK`;
  const quote = await getQuote(symbol);
  if (!quote) return null;

  const [chart, ihsgChart, fundamentals] = await Promise.all([
    getDailyHistory(symbol, 260, true),
    getDailyHistory(IHSG_SYMBOL, 30, false).catch(() => null),
    getFundamentals(symbol),
  ]);

  if (chart.bars.length < 22) return null;

  const ihsg20d = ihsgChart ? pctReturn(ihsgChart.bars.map((b) => b.close), 20) : null;
  // cache-only broker read (Section 13b cross-reference) — never blocks the
  // detail response on a fresh scrape
  const broker = await getCachedBrokerSummary(symbol.replace(/\.JK$/i, "")).catch(() => null);
  const stock = scoreStock(
    quote,
    chart,
    ihsg20d,
    broker ? { score: broker.score, tier: broker.tier } : null,
  );
  const detail = buildStockDetail(stock, chart, fundamentals);

  // Section 13b: full authenticity assessment with the same broker context
  detail.volumeAuthenticity = {
    ...volumeAuthenticity(chart.bars, {
      brokerAccumulationScore: broker?.score ?? null,
      brokerTier: broker?.tier ?? null,
      marketCap: quote.marketCap,
    }),
    ticker: symbol.replace(/\.JK$/i, ""),
  };

  const actions = await mergeWithNewsFeed(corporateActionsFromEvents(chart.events, quote), symbol);
  return { stock: detail, actions, updatedAt: quote.updatedAt };
}

export function getStockDetail(ticker: string): Promise<{
  stock: StockDetail;
  actions: CorporateAction[];
  updatedAt: string;
} | null> {
  return cached(`stock:${ticker.toUpperCase()}`, 2 * 60 * 1000, () => computeStockDetail(ticker));
}

// ── corporate action radar ──────────────────────────────────────────────

/** Merge Yahoo's structured dividends/splits with the classified news feed.
 *  Yahoo entries win on duplicates (they carry precise amounts/yields). */
async function mergeWithNewsFeed(
  yahooActions: CorporateAction[],
  symbol: string,
): Promise<CorporateAction[]> {
  const feed = await getCorporateActionsFeed().catch(() => null);
  const live = (feed?.actions ?? []).filter((a) => a.ticker === symbol.replace(/\.JK$/i, ""));
  const seen = new Set(yahooActions.map((a) => `${a.ticker}|${a.date}|${a.type}`));
  return [
    ...yahooActions,
    ...live.filter((a) => !seen.has(`${a.ticker}|${a.date}|${a.type}`)),
  ].sort((a, b) => b.date.localeCompare(a.date));
}

async function computeEvents(): Promise<{
  actions: CorporateAction[];
  updatedAt: string;
  warnings: string[];
}> {
  const quotes = await getQuotes(WATCHLIST);

  const collected = await mapLimit(quotes, 6, async (q) => {
    const chart = await getDailyHistory(q.symbol, 400, true);
    return corporateActionsFromEvents(chart.events, q);
  });

  const yahooActions = collected.flat();
  const feed = await getCorporateActionsFeed().catch(() => null);
  const seen = new Set(yahooActions.map((a) => `${a.ticker}|${a.date}|${a.type}`));
  const actions = [
    ...yahooActions,
    ...(feed?.actions ?? []).filter((a) => !seen.has(`${a.ticker}|${a.date}|${a.type}`)),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 80);

  const updatedAt = quotes.reduce(
    (max, q) => (q.updatedAt > max ? q.updatedAt : max),
    quotes[0]?.updatedAt ?? new Date().toISOString(),
  );
  const warnings = feed
    ? feed.warnings
    : ["Corporate action news feed unavailable — showing dividends and splits only."];
  return { actions, updatedAt, warnings };
}

export function getEvents(): Promise<{
  actions: CorporateAction[];
  updatedAt: string;
  warnings: string[];
}> {
  return cached("events", EVENTS_TTL, computeEvents);
}

// ── history passthrough (per-ticker, cached briefly) ────────────────────

export function getPriceHistory(symbol: string, range: string): Promise<YahooChart> {
  const key = `history:${symbol}:${range}`;
  const ttl = range === "1D" || range === "1W" ? 5 * 60 * 1000 : 30 * 60 * 1000;
  return cached(key, ttl, () => getHistory(symbol, range));
}
