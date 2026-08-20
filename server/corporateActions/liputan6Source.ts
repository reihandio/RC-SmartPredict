/**
 * LIPUTAN6 scraper — "Saham" channel RSS feed.
 *
 * Source URL / structure this module was written against (2026-08-20):
 *   https://feed.liputan6.com/rss/saham
 *
 * RSS 2.0, ~50 recent items, stock-specific news ("Emiten YUPI Tebar Dividen
 * Interim 2026…"). Tickers usually appear as bare tokens (YUPI) rather than
 * in parentheses; pubDate is +0700 (WIB). Free, public, no auth.
 *
 * Rules applied (CLAUDE.md Section 3): server-side only, strict try/catch +
 * timeout in rss.ts; any failure → this module throws so the aggregator can
 * report the source as unavailable instead of serving empty data.
 */
import { fetchRssFeed, type FeedItem, type FeedSource } from "./rss.js";

export const LIPUTAN6_SOURCE: FeedSource = {
  id: "Liputan6",
  url: "https://feed.liputan6.com/rss/saham",
};

const MAX_ITEMS = 50;

export async function fetchLiputan6Items(): Promise<FeedItem[]> {
  return fetchRssFeed(LIPUTAN6_SOURCE.url, { maxItems: MAX_ITEMS });
}
