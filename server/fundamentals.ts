/**
 * Fundamentals for the swing-candidate sanity layer (Section 13c).
 *
 * FREE PUBLIC SOURCE: Yahoo Finance structured endpoints via yahoo-finance2 —
 * the same server-side library already used for quotes/OHLCV. No scraping,
 * no credentials.
 *  - quoteSummary (financialData, defaultKeyStatistics, assetProfile):
 *    ROE, ROA, debt-to-equity, price-to-book, sector
 *  - fundamentalsTimeSeries (module "financials", quarterly):
 *    diluted EPS history → EPS trend (quoteSummary income-statement
 *    submodules stopped returning data in Nov 2024; the time-series
 *    endpoint is the working replacement)
 *
 * All values are optional: a ticker without coverage gets undefined fields,
 * and the UI says "not available from the free source" — never invented.
 * The spec's red-flag inputs (auditor going-concern notes, shareholder
 * sell-offs, delisting history) are NOT available from this free source, so
 * redFlags only ever carries what can be derived here.
 */
import YahooFinance from "yahoo-finance2";
import type { Fundamentals } from "../src/types/index.js";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

interface QuoteSummaryModules {
  financialData?: {
    returnOnEquity?: number; // 0-1
    returnOnAssets?: number; // 0-1
    debtToEquity?: number; // %
  };
  defaultKeyStatistics?: {
    priceToBook?: number;
  };
  assetProfile?: {
    sector?: string;
  };
}

interface QuarterlyRow {
  asOfDate?: Date | string;
  dilutedEPS?: number;
  basicEPS?: number;
  periodType?: string;
}

function epsTrendFromHistory(rows: QuarterlyRow[]): Fundamentals["epsTrend"] {
  const eps = rows
    .filter((r) => r.periodType === "3M" && typeof r.dilutedEPS === "number" && Number.isFinite(r.dilutedEPS))
    .map((r) => r.dilutedEPS as number);

  if (eps.length < 4) return undefined; // insufficient quarterly history
  const recent = eps.slice(0, 2);
  const prior = eps.slice(2, 4);
  const avg = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
  const change = ((avg(recent) - avg(prior)) / Math.abs(avg(prior))) * 100;
  if (change > 5) return "IMPROVING";
  if (change < -5) return "DECLINING";
  return "FLAT";
}

/** Sanity bounds — Yahoo's priceToBook occasionally returns garbage for IDX tickers. */
function sanePbv(v: number | undefined): number | undefined {
  if (v === undefined || !Number.isFinite(v) || v <= 0.05 || v > 100) return undefined;
  return Math.round(v * 100) / 100;
}

/** Full Section 13c fundamentals; null when the source has nothing. */
export async function getSwingFundamentals(ticker: string): Promise<Fundamentals | null> {
  const symbol = ticker.toUpperCase().endsWith(".JK") ? ticker.toUpperCase() : `${ticker.toUpperCase()}.JK`;

  let summary: QuoteSummaryModules | null = null;
  try {
    summary = (await yf.quoteSummary(symbol, {
      modules: ["financialData", "defaultKeyStatistics", "assetProfile"],
    })) as QuoteSummaryModules;
  } catch {
    summary = null;
  }

  let epsTrend: Fundamentals["epsTrend"];
  try {
    const rows = (await yf.fundamentalsTimeSeries(symbol, {
      module: "financials",
      period1: new Date(Date.now() - 1000 * 86400e3).toISOString().slice(0, 10),
      type: "quarterly",
    })) as QuarterlyRow[] | null;
    epsTrend = epsTrendFromHistory(rows ?? []);
  } catch {
    epsTrend = undefined;
  }

  const fd = summary?.financialData;
  const ks = summary?.defaultKeyStatistics;
  const sector = summary?.assetProfile?.sector;

  const hasAny =
    fd?.returnOnEquity !== undefined ||
    fd?.returnOnAssets !== undefined ||
    fd?.debtToEquity !== undefined ||
    sanePbv(ks?.priceToBook) !== undefined ||
    sector !== undefined ||
    epsTrend !== undefined;

  if (!hasAny) return null;

  return {
    sector,
    epsTrend,
    pbv: sanePbv(ks?.priceToBook),
    roa: fd?.returnOnAssets !== undefined ? Math.round(fd.returnOnAssets * 1000) / 10 : undefined,
    roe: fd?.returnOnEquity !== undefined ? Math.round(fd.returnOnEquity * 1000) / 10 : undefined,
    der: fd?.debtToEquity !== undefined && Number.isFinite(fd.debtToEquity)
      ? Math.round(fd.debtToEquity) / 100
      : undefined,
    redFlags: [],
    sectorInFavor: undefined, // needs whole-market sector momentum — not assessed from the free source
  };
}
