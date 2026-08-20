/**
 * Corporate-action feed service (Section 14): fetches ALL registered sources
 * in parallel, classifies every item into a corporate-action type + impact +
 * catalyst score, deduplicates the same event reported by several outlets,
 * and serves the result from the shared SWR cache.
 *
 * No cron job: news changes slowly, so a 4-hour TTL with stale-while-
 * revalidate (server/cache.ts) keeps this light for Vercel's free tier.
 * Per-source failures degrade gracefully — one broken source never empties
 * the feed, and the response carries `warnings` so the UI can say exactly
 * which outlet is unavailable (Section 28).
 *
 * Dedupe is deliberately simple (Section 14): same ticker + type + dates
 * within ±1 day counts as the same event, no NLP. Direct-source items are
 * preferred over Google News syndicated copies of the same story.
 */
import type { CorporateAction } from "../../src/types/index.js";
import { WATCHLIST } from "../watchlist.js";
import { cached } from "../cache.js";
import { classifyNews } from "./classify.js";
import { NEWS_FEEDS, fetchFeed } from "./sources.js";
import { toJakartaDate, type FeedItem, type FeedSource } from "./rss.js";
import { KONTAN_SOURCE, fetchKontanItems } from "./kontanSource.js";
import { LIPUTAN6_SOURCE, fetchLiputan6Items } from "./liputan6Source.js";
import { CNN_INDONESIA_SOURCE, fetchCnnIndonesiaItems } from "./cnnIndonesiaSource.js";
import { ANTARA_SOURCE, fetchAntaraItems } from "./antaraSource.js";
import { GOOGLE_NEWS_SOURCE, fetchGoogleNewsItems } from "./googleNewsSource.js";
import { IDX_SOURCE, fetchIdxItems } from "./idxSource.js";
import { IDN_FINANCIALS_SOURCE, fetchIdnFinancialsItems } from "./idnFinancialsSource.js";
import { BISNIS_SOURCE, fetchBisnisItems } from "./bisnisSource.js";
import { IDX_TICKERS } from "./idxTickers.js";

export interface CorporateActionsFeed {
  actions: CorporateAction[];
  /** Which sources failed this refresh (empty = all sources healthy). */
  warnings: string[];
  updatedAt: string;
}

interface SourceSpec {
  source: FeedSource;
  fetchItems: () => Promise<FeedItem[]>;
  /**
   * false → failures are console-only because another channel covers the
   * same outlet (IDN Financials & Bisnis.com flow through Google News
   * syndication when their own sites are Cloudflare-blocked).
   */
  warnOnFail: boolean;
}

function buildSources(knownCodes: Set<string>): SourceSpec[] {
  return [
    ...NEWS_FEEDS.map((source) => ({
      source,
      fetchItems: () => fetchFeed(source),
      warnOnFail: true,
    })),
    { source: KONTAN_SOURCE, fetchItems: fetchKontanItems, warnOnFail: true },
    { source: LIPUTAN6_SOURCE, fetchItems: fetchLiputan6Items, warnOnFail: true },
    { source: CNN_INDONESIA_SOURCE, fetchItems: fetchCnnIndonesiaItems, warnOnFail: true },
    { source: ANTARA_SOURCE, fetchItems: fetchAntaraItems, warnOnFail: true },
    { source: GOOGLE_NEWS_SOURCE, fetchItems: fetchGoogleNewsItems, warnOnFail: true },
    { source: IDX_SOURCE, fetchItems: () => fetchIdxItems(knownCodes), warnOnFail: true },
    { source: IDN_FINANCIALS_SOURCE, fetchItems: fetchIdnFinancialsItems, warnOnFail: false },
    { source: BISNIS_SOURCE, fetchItems: fetchBisnisItems, warnOnFail: false },
  ];
}

const FEED_TTL = 4 * 60 * 60 * 1000; // 4 h — corporate actions change less often than quotes
const MAX_ACTIONS = 80;

interface SourceResult {
  spec: SourceSpec;
  items: FeedItem[];
  failed: boolean;
  reason: string;
}

async function computeFeed(): Promise<CorporateActionsFeed> {
  // Accept any real IDX ticker (full listed universe), not just the watchlist,
  // so the radar covers the whole market. The watchlist stays in the union as
  // a safety net for newly listed symbols not in the static snapshot yet.
  const known = new Set([
    ...IDX_TICKERS,
    ...WATCHLIST.map((s) => s.replace(/\.JK$/i, "")),
  ]);
  const today = toJakartaDate(new Date());
  const sources = buildSources(known);

  // Fetch every source in parallel; a failing source only skips itself.
  const settled = await Promise.allSettled(
    sources.map(async (spec): Promise<SourceResult> => {
      try {
        return { spec, items: await spec.fetchItems(), failed: false, reason: "" };
      } catch (err) {
        console.error(`[corporateActions] ${spec.source.id} fetch failed:`, err);
        return {
          spec,
          items: [],
          failed: true,
          reason: err instanceof Error ? err.message : "feed unavailable",
        };
      }
    }),
  );
  const results = settled.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { spec: sources[i], items: [], failed: true, reason: "unexpected rejection" },
  );

  // Classify every item from every source; hints + sourceOverride let
  // topic-page and syndication sources carry their own knowledge.
  const ranked: Array<{ action: CorporateAction; viaGoogle: boolean }> = [];
  for (const { spec, items } of results) {
    for (const item of items) {
      const action = classifyNews(item.title, item.link, item.date, spec.source, known, today, {
        type: item.typeHint,
        ticker: item.tickerHint,
      });
      if (!action) continue;
      if (item.sourceOverride) action.source = item.sourceOverride;
      ranked.push({ action, viaGoogle: item.link.includes("news.google.com") });
    }
  }

  // Dedupe: same ticker + type with dates within ±1 day = same event.
  // Newest first, direct sources before Google-syndicated copies, then by
  // score — the first surviving occurrence is the one shown.
  ranked.sort(
    (a, b) =>
      b.action.date.localeCompare(a.action.date) ||
      (a.viaGoogle === b.viaGoogle ? 0 : a.viaGoogle ? 1 : -1) ||
      b.action.score - a.action.score,
  );
  const accepted: Array<{ ticker: string; type: string; day: number }> = [];
  const unique: CorporateAction[] = [];
  for (const { action } of ranked) {
    const day = Date.parse(`${action.date}T00:00:00Z`) / 86400e3;
    if (
      accepted.some(
        (s) => s.ticker === action.ticker && s.type === action.type && Math.abs(s.day - day) <= 1,
      )
    ) {
      continue;
    }
    accepted.push({ ticker: action.ticker, type: action.type, day });
    unique.push(action);
    if (unique.length >= MAX_ACTIONS) break;
  }

  // User-visible warnings only for sources with no alternate channel;
  // fallback-covered failures stay in the server log.
  const warnings = results
    .filter((r) => r.failed && r.spec.warnOnFail)
    .map((r) => `${r.spec.source.id}: ${r.reason || "feed unavailable"}`);
  for (const r of results.filter((r) => r.failed && !r.spec.warnOnFail)) {
    console.warn(
      `[corporateActions] ${r.spec.source.id} direct fetch failed (syndication covers it):`,
      r.reason,
    );
  }

  return {
    actions: unique,
    warnings,
    updatedAt: new Date().toISOString(),
  };
}

export function getCorporateActionsFeed(): Promise<CorporateActionsFeed> {
  return cached("corporate-actions-feed", FEED_TTL, computeFeed);
}
