/**
 * YahooFinanceProvider — thin wrapper over the yahoo-finance2 library
 * (structured Yahoo Finance endpoints; no HTML scraping).
 *
 * Runs server-side only (Vercel functions / vite dev middleware).
 * No credentials are required for the public endpoints used here.
 */
import YahooFinance from "yahoo-finance2";

/** Structural shape of the yahoo-finance2 chart result (overload-safe). */
interface YahooRawChart {
  quotes?: Array<{
    date: Date | string;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number | null;
  }>;
  events?: Record<string, Array<{ date: Date | string; amount?: number }>>;
  meta?: { regularMarketTime?: number };
}

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export interface YahooBar {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface YahooEvent {
  date: string; // yyyy-mm-dd
  type: "Dividend" | "Stock Split";
  amount?: number;
}

export interface YahooQuote {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  prevClose: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  high52: number;
  low52: number;
  updatedAt: string; // ISO from regularMarketTime
}

export interface YahooChart {
  bars: YahooBar[];
  events: YahooEvent[];
  updatedAt: string;
}

const DAY = 86400;

function toIso(ms: number | undefined): string {
  return ms ? new Date(ms * 1000).toISOString() : new Date().toISOString();
}

function normalizeChart(c: YahooRawChart): YahooChart {
  const bars: YahooBar[] = (c.quotes ?? [])
    .filter((q) => q && q.close !== null && q.high !== null && q.low !== null && q.open !== null)
    .map((q) => ({
      time: Math.floor(new Date(q.date as Date).getTime() / 1000),
      open: q.open as number,
      high: q.high as number,
      low: q.low as number,
      close: q.close as number,
      volume: q.volume ?? 0,
    }))
    .sort((a, b) => a.time - b.time);

  const events: YahooEvent[] = [];
  const ev = c.events ?? {};
  for (const [key, list] of Object.entries(ev)) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (typeof item.date !== "string" && !(item.date instanceof Date)) continue;
      const date = new Date(item.date as Date).toISOString().slice(0, 10);
      if (key === "dividends") {
        events.push({ date, type: "Dividend", amount: Number(item.amount ?? 0) });
      } else if (key === "splits") {
        events.push({ date, type: "Stock Split" });
      }
    }
  }
  events.sort((a, b) => b.date.localeCompare(a.date));

  return {
    bars,
    events,
    updatedAt: toIso(c.meta?.regularMarketTime),
  };
}

async function getChart(
  symbol: string,
  period1: number,
  period2: number,
  interval: "5m" | "15m" | "60m" | "1d",
  includeEvents: boolean,
): Promise<YahooChart> {
  const options: {
    period1: number;
    period2: number;
    interval: "5m" | "15m" | "60m" | "1d";
    events?: string;
  } = { period1, period2, interval };
  if (includeEvents) options.events = "div|split";
  const raw = (await yf.chart(symbol, options)) as unknown as YahooRawChart;
  return normalizeChart(raw);
}

/** Historical OHLCV for the UI ranges. */
export async function getHistory(symbol: string, range: string): Promise<YahooChart> {
  const now = Math.floor(Date.now() / 1000);
  switch (range) {
    case "1D":
      return getChart(symbol, now - 2 * DAY, now, "5m", false);
    case "1W":
      return getChart(symbol, now - 8 * DAY, now, "15m", false);
    case "1M":
      return getChart(symbol, now - 40 * DAY, now, "60m", false);
    case "3M":
      return getChart(symbol, now - 95 * DAY, now, "1d", false);
    case "6M":
      return getChart(symbol, now - 190 * DAY, now, "1d", false);
    case "1Y":
      return getChart(symbol, now - 400 * DAY, now, "1d", false);
    default:
      return getChart(symbol, now - 190 * DAY, now, "1d", false);
  }
}

/** Recent daily bars (for scoring) + events (for catalysts / corporate actions). */
export async function getDailyHistory(
  symbol: string,
  days = 80,
  includeEvents = true,
): Promise<YahooChart> {
  const now = Math.floor(Date.now() / 1000);
  return getChart(symbol, now - (days + 10) * DAY, now, "1d", includeEvents);
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** Normalized quote for one symbol (single-symbol call). */
export async function getQuote(symbol: string): Promise<YahooQuote | null> {
  const q = await yf.quote(symbol);
  return quoteFromRaw(q);
}

/** Batch quotes — chunked to stay within provider limits; bad symbols are skipped. */
export async function getQuotes(symbols: string[]): Promise<YahooQuote[]> {
  const out: YahooQuote[] = [];
  const chunkSize = 15;
  for (let i = 0; i < symbols.length; i += chunkSize) {
    const chunk = symbols.slice(i, i + chunkSize);
    const results = await Promise.allSettled(chunk.map((s) => yf.quote(s)));
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        const q = quoteFromRaw(r.value);
        if (q && q.price > 0) out.push(q);
      }
    }
    // small pause between chunks to be gentle with the provider
    await new Promise((r) => setTimeout(r, 250));
  }
  return out;
}

function quoteFromRaw(q: Record<string, unknown> | null | undefined): YahooQuote | null {
  if (!q) return null;
  const symbol = String(q.symbol ?? "");
  const price = num(q.regularMarketPrice);
  if (!symbol || price <= 0) return null;
  return {
    symbol,
    name: String(q.longName ?? q.shortName ?? symbol),
    price,
    changePercent: num(q.regularMarketChangePercent),
    prevClose: num(q.regularMarketPreviousClose),
    volume: num(q.regularMarketVolume),
    avgVolume: num(q.averageDailyVolume3Month),
    marketCap: num(q.marketCap),
    high52: num(q.fiftyTwoWeekHigh),
    low52: num(q.fiftyTwoWeekLow),
    updatedAt: toIso(num(q.regularMarketTime) || undefined),
  };
}

/** Fundamentals (sector / industry) — best effort from quoteSummary. */
export async function getFundamentals(symbol: string): Promise<{
  sector?: string;
  industry?: string;
  description?: string;
} | null> {
  try {
    const qs = await yf.quoteSummary(symbol, {
      modules: ["assetProfile", "summaryProfile"],
    });
    const profile = (qs as { assetProfile?: Record<string, unknown> }).assetProfile ?? {};
    const summary = (qs as { summaryProfile?: Record<string, unknown> }).summaryProfile ?? {};
    const sector = typeof profile.sector === "string" ? profile.sector : undefined;
    const industry = typeof profile.industry === "string" ? profile.industry : undefined;
    const description =
      typeof summary.longBusinessSummary === "string" ? summary.longBusinessSummary : undefined;
    return sector || industry || description ? { sector, industry, description } : null;
  } catch {
    return null;
  }
}
