/**
 * CNN INDONESIA scraper — "Ekonomi" channel RSS feed.
 *
 * Source URL / structure this module was written against (2026-08-20):
 *   https://www.cnnindonesia.com/ekonomi/rss
 *
 * RSS 2.0, ~100 recent items, mostly macro/business news; corporate-action
 * stories surface occasionally and pass the same classifier as every other
 * source (low yield, but free, public, and stable — no auth).
 * pubDate is +0700 (WIB).
 *
 * Rules applied (CLAUDE.md Section 3): server-side only, strict try/catch +
 * timeout in rss.ts; any failure → this module throws so the aggregator can
 * report the source as unavailable instead of serving empty data.
 */
import { fetchRssFeed, type FeedItem, type FeedSource } from "./rss.js";

export const CNN_INDONESIA_SOURCE: FeedSource = {
  id: "CNN Indonesia",
  url: "https://www.cnnindonesia.com/ekonomi/rss",
};

const MAX_ITEMS = 100;

export async function fetchCnnIndonesiaItems(): Promise<FeedItem[]> {
  return fetchRssFeed(CNN_INDONESIA_SOURCE.url, { maxItems: MAX_ITEMS });
}
