/**
 * KONTAN scraper — market/investment RSS feed.
 *
 * Source URL / structure this module was written against (2026-08-20):
 *   https://investasi.kontan.co.id/rss
 *
 * RSS 2.0, ~25 recent items, all capital-market news. Titles usually carry
 * ticker codes in parentheses, e.g. "Eagle High (BWPT) Akan Jual 402,92 Juta
 * Saham Hasil Buyback". pubDate is +0700 (WIB). Free, public, no auth.
 * (kontan.co.id/rss itself is an HTML landing page — use the subdomain.)
 *
 * Rules applied (CLAUDE.md Section 3): server-side only, strict try/catch +
 * timeout in rss.ts; any failure → this module throws so the aggregator can
 * report the source as unavailable instead of serving empty data.
 */
import { fetchRssFeed, type FeedItem, type FeedSource } from "./rss.js";

export const KONTAN_SOURCE: FeedSource = {
  id: "Kontan",
  url: "https://investasi.kontan.co.id/rss",
};

const MAX_ITEMS = 25;

export async function fetchKontanItems(): Promise<FeedItem[]> {
  return fetchRssFeed(KONTAN_SOURCE.url, { maxItems: MAX_ITEMS });
}
