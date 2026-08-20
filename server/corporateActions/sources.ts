/**
 * RSS news sources — public feeds from Indonesian financial media, fetched
 * server-side and cached (Section 3: unofficial sources must be isolated
 * behind their own module and never hit from the browser).
 *
 * Written against (2026-08-20):
 *   - CNBC Indonesia market feed:  https://www.cnbcindonesia.com/market/rss
 *     RSS 2.0, ~100 recent items, titles carry ticker codes in parentheses,
 *     e.g. "BCA (BBCA) Tebar Dividen Interim Kuartal III-2026".
 *   - IDX Channel general feed:    https://www.idxchannel.com/rss
 *     RSS 2.0, ~10 recent items, business/market news.
 *
 * Both feeds are free, public, and require no auth. Fetching/parsing is
 * shared with the other per-source modules via rss.ts.
 *
 * Blocked-source status (moved to their own modules, see below):
 *   - IDX official announcements → idxSource.ts (Cloudflare hard-block, 403)
 *   - IDN Financials topic pages   → idnFinancialsSource.ts (Cloudflare JS challenge)
 *   - Bisnis.com topic pages       → bisnisSource.ts (Cloudflare JS challenge)
 *   - EmitenNews (emitennews.com/rss, /feed) returns 500.
 */
import { fetchRssFeed, type FeedItem, type FeedSource } from "./rss.js";

export type { FeedItem, FeedSource } from "./rss.js";

export const NEWS_FEEDS: FeedSource[] = [
  { id: "CNBC Indonesia", url: "https://www.cnbcindonesia.com/market/rss" },
  { id: "IDX Channel", url: "https://www.idxchannel.com/rss" },
];

const MAX_ITEMS_PER_FEED = 60;

/** Fetch + parse a single feed. Throws on network error so the caller can
 *  record it as a warning and keep serving the other sources. */
export async function fetchFeed(source: FeedSource): Promise<FeedItem[]> {
  return fetchRssFeed(source.url, { maxItems: MAX_ITEMS_PER_FEED });
}
