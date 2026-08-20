/**
 * Shared low-level RSS 2.0 fetch/parse used by every news-feed source module
 * (Section 3: unofficial sources run server-side only, isolated per source so
 * one breakage doesn't take down the others).
 *
 * Parsing is regex-based (Node has no DOM). RSS 2.0 item fields are stable
 * and titles are usually wrapped in CDATA, so this is reasonably robust.
 *
 * Dates are normalized to Asia/Jakarta (WIB, fixed UTC+7 — no DST) because
 * Indonesian feeds publish in WIB while Google News publishes in GMT; without
 * a common timezone the same event would land on two different calendar days
 * and survive cross-source deduplication.
 */

export interface FeedItem {
  /** Cleaned headline text (CDATA unwrapped, entities decoded). */
  title: string;
  /** Article URL. */
  link: string;
  /** yyyy-mm-dd in Asia/Jakarta time. */
  date: string;
  /**
   * Optional classification hints filled in by sources that already know the
   * event type (e.g. a topic page) or the ticker (e.g. a name→code map).
   * Used by classify.ts when the headline alone is not conclusive.
   */
  typeHint?: string;
  tickerHint?: string;
  /** Override for the displayed source name (used by syndication feeds that
   *  carry items from several outlets, e.g. Google News). */
  sourceOverride?: string;
}

export interface FeedSource {
  id: string; // display name shown in the UI ("CNBC Indonesia")
  url: string;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_ITEMS = 60;

/** Browser-ish headers shared by all feeds; keeps CDNs from serving a
 *  challenge page instead of the feed. */
export const FEED_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (compatible; RCSmartPredict/1.0; +https://rcsmartpredict.vercel.app)",
  Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
};

export function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/** yyyy-mm-dd for a Date, expressed in Asia/Jakarta (fixed UTC+7). */
export function toJakartaDate(date: Date): string {
  return new Date(date.getTime() + 7 * 3600e3).toISOString().slice(0, 10);
}

/** Extract one RSS 2.0 <item>…</item> block into a FeedItem. */
function parseItem(block: string): FeedItem | null {
  const title = block.match(/<title>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/title>/i)?.[1];
  const link = block.match(/<link>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/link>/i)?.[1];
  const pubDate =
    block.match(/<(?:pubDate|dc:date)>\s*([\s\S]*?)\s*<\/(?:pubDate|dc:date)>/i)?.[1];
  if (!title || !link) return null;
  const parsed = pubDate ? new Date(pubDate) : null;
  return {
    title: decodeEntities(title),
    link: decodeEntities(link),
    date:
      parsed && !Number.isNaN(parsed.getTime())
        ? toJakartaDate(parsed)
        : toJakartaDate(new Date()),
  };
}

/** Fetch + parse an RSS 2.0 feed. Throws on network/HTTP error so the caller
 *  can record it as a warning and keep serving the other sources. */
export async function fetchRssFeed(
  url: string,
  opts: { timeoutMs?: number; maxItems?: number; headers?: Record<string, string> } = {},
): Promise<FeedItem[]> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, maxItems = DEFAULT_MAX_ITEMS, headers } = opts;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { ...FEED_HEADERS, ...headers },
  });
  if (!res.ok) {
    throw new Error(`feed returned HTTP ${res.status}`);
  }
  const xml = await res.text();
  const items: FeedItem[] = [];
  // Split on the opening <item> tag; each chunk contains one item's fields.
  for (const block of xml.split(/<item[^>]*>/i).slice(1)) {
    const item = parseItem(block);
    if (item) items.push(item);
    if (items.length >= maxItems) break;
  }
  return items;
}
