/**
 * GOOGLE NEWS scraper — public RSS syndication search, used as the working
 * channel for outlets whose own sites block server-side fetch with Cloudflare
 * challenges (IDN Financials, Bisnis.com, EmitenNews, investor.id, …).
 *
 * Source URL / structure this module was written against (2026-08-20):
 *   https://news.google.com/rss/search?q=<query>&hl=id&gl=ID&ceid=ID:id
 *
 * RSS 2.0, up to ~100 items per query, relevance-sorted. Item titles carry
 * the originating domain as a suffix ("CBDK gelar buyback … - idnfinancials.com")
 * and a <source url="…"> element; pubDate is GMT. The suffix is stripped and
 * each item is relabelled with the ORIGINAL outlet name (sourceOverride), so
 * the radar's per-source filter chips keep working per outlet instead of
 * showing everything as "Google News".
 *
 * Two keyword queries are used to widen recall; overlapping results are
 * deduplicated by the aggregator. The news.google.com redirect link is kept
 * as sourceUrl (it forwards to the real article; resolving each redirect
 * server-side would cost one request per item).
 *
 * Free, public, no auth — this is Google News' public RSS endpoint.
 * Rules applied (CLAUDE.md Section 3): server-side only, strict try/catch +
 * timeout; per-query failures degrade, the module only throws if EVERY query
 * fails.
 */
import {
  FEED_HEADERS,
  decodeEntities,
  toJakartaDate,
  type FeedItem,
  type FeedSource,
} from "./rss.js";

export const GOOGLE_NEWS_SOURCE: FeedSource = {
  id: "Google News",
  url: "https://news.google.com/rss",
};

const QUERIES = [
  '(akuisisi OR buyback OR "rights issue" OR "private placement" OR "tender offer" OR merger OR "stock split") saham',
  '("aksi korporasi" OR "keterbukaan informasi" OR "pemanggilan RUPS" OR "pembelian kembali" OR dividen) emiten',
];

const MAX_ITEMS_PER_QUERY = 100;
const TIMEOUT_MS = 15_000;

/** Domain → display name. Unknown outlets keep their bare hostname. */
const OUTLET_NAMES: Record<string, string> = {
  "idnfinancials.com": "IDN Financials",
  "www.idnfinancials.com": "IDN Financials",
  "bisnis.com": "Bisnis.com",
  "market.bisnis.com": "Bisnis.com",
  "ekonomi.bisnis.com": "Bisnis.com",
  "finansial.bisnis.com": "Bisnis.com",
  "www.bisnis.com": "Bisnis.com",
  "cnbcindonesia.com": "CNBC Indonesia",
  "www.cnbcindonesia.com": "CNBC Indonesia",
  "idxchannel.com": "IDX Channel",
  "www.idxchannel.com": "IDX Channel",
  "investasi.kontan.co.id": "Kontan",
  "kontan.co.id": "Kontan",
  "www.kontan.co.id": "Kontan",
  "liputan6.com": "Liputan6",
  "www.liputan6.com": "Liputan6",
  "m.liputan6.com": "Liputan6",
  "cnnindonesia.com": "CNN Indonesia",
  "www.cnnindonesia.com": "CNN Indonesia",
  "antaranews.com": "Antara",
  "www.antaranews.com": "Antara",
  "emitennews.com": "EmitenNews",
  "www.emitennews.com": "EmitenNews",
  "idx.co.id": "IDX Resmi",
  "www.idx.co.id": "IDX Resmi",
  "investor.id": "Investor.id",
  "www.investor.id": "Investor.id",
  "tempo.co": "Tempo",
  "bisnis.tempo.co": "Tempo",
  "www.tempo.co": "Tempo",
  "money.kompas.com": "Kompas",
  "katadata.co.id": "Katadata",
  "www.katadata.co.id": "Katadata",
  "finance.detik.com": "Detik Finance",
  "swa.co.id": "SWA",
  "www.swa.co.id": "SWA",
  "investortrust.id": "InvestorTrust",
  "www.investortrust.id": "InvestorTrust",
  "kabarbursa.com": "Kabarbursa",
  "www.kabarbursa.com": "Kabarbursa",
};

/** Parse one Google News <item> block, relabelling it with the original
 *  outlet and stripping the "- domain" suffix Google appends to titles. */
function parseGoogleItem(block: string): FeedItem | null {
  const title = block.match(/<title>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/title>/i)?.[1];
  const link = block.match(/<link>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/link>/i)?.[1];
  const pubDate = block.match(/<pubDate>\s*([\s\S]*?)\s*<\/pubDate>/i)?.[1];
  const sourceMatch = block.match(/<source url="([^"]*)"\s*>([^<]*)<\/source>/i);
  if (!title || !link) return null;

  const hostname = sourceMatch?.[1] ? hostOf(sourceMatch[1]) : "";
  const bareHost = hostname.replace(/^www\./, "");
  const sourceText = sourceMatch?.[2]?.trim() ?? "";
  const label =
    (hostname && OUTLET_NAMES[hostname]) ||
    (bareHost && OUTLET_NAMES[bareHost]) ||
    hostname ||
    GOOGLE_NEWS_SOURCE.id;

  // Google appends " - domain" (or " — domain") to the headline, and the
  // suffix can use the www-less domain or the outlet's display name.
  let cleanTitle = decodeEntities(title);
  const suffixCandidates = [...new Set([hostname, bareHost, sourceText, label])].filter(
    (s): s is string => s.length > 0,
  );
  for (const suffix of suffixCandidates) {
    cleanTitle = cleanTitle
      .replace(new RegExp(`\\s+[-–—]\\s+${escapeRegExp(suffix)}\\s*$`, "i"), "")
      .trim();
  }
  // Long headlines are sometimes truncated with "…" in <title> while the
  // <description> carries the full text inside an <a>.
  if (cleanTitle.endsWith("…")) {
    const descLink = block.match(/<description>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i)?.[1];
    if (descLink) {
      const full = decodeEntities(descLink);
      if (full.length > cleanTitle.length) cleanTitle = full;
    }
  }

  const parsed = pubDate ? new Date(pubDate) : null;
  return {
    title: cleanTitle,
    link: decodeEntities(link),
    date:
      parsed && !Number.isNaN(parsed.getTime())
        ? toJakartaDate(parsed)
        : toJakartaDate(new Date()),
    sourceOverride: label,
  };
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function queryUrl(query: string): string {
  return (
    `${GOOGLE_NEWS_SOURCE.url}/search?q=${encodeURIComponent(query)}` +
    "&hl=id&gl=ID&ceid=ID:id"
  );
}

/** Fetch + parse one query. Throws on network/HTTP error. */
async function fetchQuery(query: string): Promise<FeedItem[]> {
  const res = await fetch(queryUrl(query), {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: FEED_HEADERS,
  });
  if (!res.ok) {
    throw new Error(`Google News query returned HTTP ${res.status}`);
  }
  const xml = await res.text();
  const items: FeedItem[] = [];
  for (const block of xml.split(/<item[^>]*>/i).slice(1)) {
    const item = parseGoogleItem(block);
    if (item) items.push(item);
    if (items.length >= MAX_ITEMS_PER_QUERY) break;
  }
  return items;
}

/**
 * Fetch all queries in parallel and merge their items. One failing query is
 * tolerated; throws only when every query fails, so the aggregator can
 * report the source as unavailable.
 */
export async function fetchGoogleNewsItems(): Promise<FeedItem[]> {
  const settled = await Promise.allSettled(QUERIES.map((q) => fetchQuery(q)));
  const merged: FeedItem[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") merged.push(...result.value);
    else console.warn("[corporateActions] Google News query failed:", result.reason);
  }
  if (merged.length === 0) {
    const reason = settled.find((r) => r.status === "rejected")?.reason;
    throw new Error(
      `all Google News queries failed${reason instanceof Error ? `: ${reason.message}` : ""}`,
    );
  }
  return merged;
}
