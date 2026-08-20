/**
 * BISNIS.COM scraper — corporate-action topic pages.
 *
 * Source URL / structure this module was written against (2026-08-20):
 *   https://www.bisnis.com/topic/1817/aksi-korporasi     (general)
 *   https://www.bisnis.com/topic/15353/akuisisi-saham    (acquisitions)
 *   …topic/<id>/<slug> pattern; each page is a server-rendered article list
 *   (links to market/ekonomi bisnis.com /read/<id>/<slug> articles).
 *
 * Only the two topic IDs above are known — the domain is behind a Cloudflare
 * JS challenge ("Just a moment…", HTTP 403) for server-side clients, verified
 * 2026-08-20, so sibling topic pages could not be enumerated.
 *
 * Because this module is expected to fail, its failure is NOT surfaced as a
 * UI warning: the same outlet's articles still reach the radar through the
 * Google News syndication channel (googleNewsSource.ts), labelled
 * "Bisnis.com". If Cloudflare relaxes and this module starts working, the
 * aggregator prefers these direct items (real article URLs) over the
 * syndicated copies.
 */
import { FEED_HEADERS, toJakartaDate, type FeedItem, type FeedSource } from "./rss.js";

export const BISNIS_SOURCE: FeedSource = {
  id: "Bisnis.com",
  url: "https://www.bisnis.com/topic/1817/aksi-korporasi",
};

const TOPICS: Array<{ url: string; typeHint?: string }> = [
  { url: "https://www.bisnis.com/topic/1817/aksi-korporasi" },
  { url: "https://www.bisnis.com/topic/15353/akuisisi-saham", typeHint: "Acquisition" },
];

const TIMEOUT_MS = 15_000;

function isCloudflareChallenge(status: number, body: string): boolean {
  return (
    status === 403 &&
    (body.includes("Just a moment") ||
      body.includes("Attention Required") ||
      body.includes("challenges.cloudflare.com"))
  );
}

/** Fetch one topic page; parse article anchors + nearby dates. */
async function fetchTopic(topic: (typeof TOPICS)[number]): Promise<FeedItem[]> {
  const res = await fetch(topic.url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { ...FEED_HEADERS, Accept: "text/html, */*" },
  });
  const body = await res.text();
  if (isCloudflareChallenge(res.status, body)) {
    throw new Error("diblokir Cloudflare (403 challenge)");
  }
  if (res.status === 404) return []; // topic moved — skip, not a failure
  if (!res.ok) throw new Error(`topic returned HTTP ${res.status}`);

  const items: FeedItem[] = [];
  const anchors =
    body.match(/<a[^>]*href="(https?:\/\/[\w.-]*bisnis\.com\/read\/[^"]+)"[^>]*>([\s\S]{10,200}?)<\/a>/gi) ?? [];
  for (const anchor of anchors) {
    const text = anchor
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length < 10) continue;
    const href = anchor.match(/href="([^"]*)"/i)?.[1] ?? topic.url;
    const date = body
      .slice(Math.max(0, body.indexOf(href) - 400), body.indexOf(href))
      .match(/(\d{4}-\d{2}-\d{2})/)?.[1];
    items.push({
      title: text,
      link: href,
      date: date ?? toJakartaDate(new Date()),
      ...(topic.typeHint ? { typeHint: topic.typeHint } : {}),
    });
    if (items.length >= 25) break;
  }
  return items;
}

/**
 * Probe the first topic, then fetch the rest in parallel. A Cloudflare
 * challenge fails the module fast; a moved (404) topic is skipped.
 */
export async function fetchBisnisItems(): Promise<FeedItem[]> {
  const [first, ...rest] = TOPICS;
  await fetchTopic(first); // probe — throws on challenge
  const settled = await Promise.allSettled(rest.map((t) => fetchTopic(t)));
  return settled
    .filter((r): r is PromiseFulfilledResult<FeedItem[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);
}
