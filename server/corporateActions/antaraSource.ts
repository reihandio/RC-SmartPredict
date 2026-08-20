/**
 * ANTARA NEWS scraper — official national news agency, "Ekonomi" RSS feed.
 *
 * Source URL / structure this module was written against (2026-08-20):
 *   https://www.antaranews.com/rss/ekonomi
 *
 * RSS 2.0, ~20 recent items, general economy news. Corporate-action yield is
 * low (headlines rarely carry tickers), but this is the most stable official
 * feed available and the classifier filters irrelevant items anyway.
 * pubDate is +0700 (WIB). Free, public, no auth.
 *
 * Rules applied (CLAUDE.md Section 3): server-side only, strict try/catch +
 * timeout in rss.ts; any failure → this module throws so the aggregator can
 * report the source as unavailable instead of serving empty data.
 */
import { fetchRssFeed, type FeedItem, type FeedSource } from "./rss.js";

export const ANTARA_SOURCE: FeedSource = {
  id: "Antara",
  url: "https://www.antaranews.com/rss/ekonomi",
};

const MAX_ITEMS = 20;

export async function fetchAntaraItems(): Promise<FeedItem[]> {
  return fetchRssFeed(ANTARA_SOURCE.url, { maxItems: MAX_ITEMS });
}
