/**
 * IDN FINANCIALS scraper — per-event topic pages.
 *
 * Source URL / structure this module was written against (2026-08-20):
 *   https://www.idnfinancials.com/id/news/topic/akuisisi
 *   …same /id/news/topic/<slug> pattern for other event types; each page is a
 *   server-rendered article list (anchor links under /id/news/<id>/<slug>).
 *
 * Topic slugs are a best-effort list — the whole domain is behind a
 * Cloudflare JS challenge ("Just a moment…", HTTP 403) for server-side
 * clients, verified 2026-08-20, so no topic page could be verified; 404
 * topics are skipped at runtime without failing the module.
 *
 * Because this module is expected to fail, its failure is NOT surfaced as a
 * UI warning: the same outlet's articles still reach the radar through the
 * Google News syndication channel (googleNewsSource.ts), labelled
 * "IDN Financials". If Cloudflare relaxes and this module starts working,
 * the aggregator prefers these direct items (real article URLs) over the
 * syndicated copies.
 */
import { FEED_HEADERS, toJakartaDate, type FeedItem, type FeedSource } from "./rss.js";

export const IDN_FINANCIALS_SOURCE: FeedSource = {
  id: "IDN Financials",
  url: "https://www.idnfinancials.com/id/news/topic/akuisisi",
};

/** Topic slug → corporate-action type hint (classify.ts trusts the title
 *  first, then this hint). */
const TOPICS: Array<{ slug: string; typeHint: string }> = [
  { slug: "akuisisi", typeHint: "Acquisition" },
  { slug: "merger", typeHint: "Merger" },
  { slug: "rights-issue", typeHint: "Right Issue" },
  { slug: "tender-offer", typeHint: "Tender Offer" },
  { slug: "private-placement", typeHint: "Private Placement" },
  { slug: "dividen", typeHint: "Dividend" },
  { slug: "buyback", typeHint: "Buyback" },
  { slug: "rups", typeHint: "RUPS" },
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
  const url = `https://www.idnfinancials.com/id/news/topic/${topic.slug}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { ...FEED_HEADERS, Accept: "text/html, */*" },
  });
  const body = await res.text();
  if (isCloudflareChallenge(res.status, body)) {
    throw new Error("diblokir Cloudflare (403 challenge)");
  }
  if (res.status === 404) return []; // topic doesn't exist — skip, not a failure
  if (!res.ok) throw new Error(`topic ${topic.slug} returned HTTP ${res.status}`);

  const items: FeedItem[] = [];
  // Article cards: <a href="/id/news/<id>/<slug>">Title</a>, date near the link.
  const anchors = body.match(/<a[^>]*href="\/id\/news\/\d+[^"]*"[^>]*>([\s\S]{10,200}?)<\/a>/gi) ?? [];
  for (const anchor of anchors) {
    const text = anchor
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length < 10) continue;
    const href = anchor.match(/href="([^"]*)"/i)?.[1] ?? "";
    const date = body
      .slice(Math.max(0, body.indexOf(href) - 400), body.indexOf(href))
      .match(/(\d{4}-\d{2}-\d{2})/)?.[1];
    items.push({
      title: text,
      link: `https://www.idnfinancials.com${href}`,
      date: date ?? toJakartaDate(new Date()),
      typeHint: topic.typeHint,
    });
    if (items.length >= 25) break;
  }
  return items;
}

/**
 * Probe the first topic, then fetch the rest in parallel. A Cloudflare
 * challenge fails the module fast (no point fetching 7 more blocked pages);
 * individual 404 topics are skipped.
 */
export async function fetchIdnFinancialsItems(): Promise<FeedItem[]> {
  const [first, ...rest] = TOPICS;
  await fetchTopic(first); // probe — throws on challenge
  const settled = await Promise.allSettled(rest.map((t) => fetchTopic(t)));
  const items = settled
    .filter((r): r is PromiseFulfilledResult<FeedItem[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);
  return items;
}
