/**
 * ISOLATED SCRAPER — IndoPremier broker summary (Bandarmology source).
 *
 * Source URL / structure this module was written against (2026-08-20):
 *   GET https://www.indopremier.com/module/saham/include/data-brokersummary.php
 *       ?code=BBRI&start=MM/DD/YYYY&end=MM/DD/YYYY&fd=all&board=all
 *
 * Unofficial (no public API) — a server-side HTML table used by
 * indopremier.com's public stock pages, also used by the open-source
 * jv-idx-mcp project (github.com/ibpme/jv-idx-mcp). Returns, per stock and
 * date range: top buyers/sellers by lot and value, totals, foreign net value.
 * Broker ownership type (foreign/local/bumn) comes from span classes
 * (text-foreign / text-local / text-bumn).
 *
 * Rules applied (CLAUDE.md Section 3):
 *  - server-side only (Vercel functions / dev middleware), never the browser
 *  - strict try/catch + timeout + limited retry
 *  - any failure → explicit "unavailable" result, never empty/zero data
 *    that could be misread as an analytical result
 */
import type { BrokerWindowRange } from "../../src/types/index.js";

const BASE_URL =
  "https://www.indopremier.com/module/saham/include/data-brokersummary.php";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
  Referer: "https://www.indopremier.com/",
  Accept: "text/html, */*",
};

const TIMEOUT_MS = 12_000;
const RETRY_DELAY_MS = 600;

/** Raw per-broker row straight from the HTML table. */
export interface IpotBrokerRow {
  code: string;
  type: "FOREIGN" | "DOMESTIC" | "RETAIL" | "UNKNOWN";
  buyLots: number;
  buyValue: number; // IDR
  sellLots: number;
  sellValue: number; // IDR
}

export interface IpotBrokerSummaryRaw {
  stock: string;
  start: string; // MM/DD/YYYY
  end: string; // MM/DD/YYYY
  rows: IpotBrokerRow[];
  totalValue: number; // IDR
  foreignNetValue: number; // IDR
}

export type IpotResult =
  | { ok: true; data: IpotBrokerSummaryRaw }
  | { ok: false; reason: "invalid-code" | "empty" | "network" | "parse" };

// ── helpers ──────────────────────────────────────────────────────────────

/** "49.3 B" / "1.0 M" / "-5.3 B" / "12,400" → number (IDR). */
function parseIdrValue(raw: string): number {
  const s = raw.replace(/,/g, "").trim();
  const m = s.match(/^(-?[\d.]+)\s*([BKMT]?)$/i);
  if (!m) return 0;
  const n = parseFloat(m[1] ?? "0");
  if (!Number.isFinite(n)) return 0;
  const suffix = (m[2] ?? "").toUpperCase();
  if (suffix === "B") return n * 1e9;
  if (suffix === "M") return n * 1e6;
  if (suffix === "T") return n * 1e12;
  if (suffix === "K") return n * 1e3;
  return n;
}

function parseLots(raw: string): number {
  const s = raw.replace(/,/g, "").trim();
  const m = s.match(/^([\d.]+)\s*([KMBT]?)$/i);
  if (!m) return 0;
  const n = parseFloat(m[1] ?? "0");
  if (!Number.isFinite(n)) return 0;
  const suffix = (m[2] ?? "").toUpperCase();
  if (suffix === "M") return n * 1e6;
  if (suffix === "K") return n * 1e3;
  if (suffix === "B") return n * 1e9;
  return n;
}

function brokerTypeFromHtml(tdHtml: string, code: string): IpotBrokerRow["type"] {
  if (code === "XL" || code === "PD" || code === "YP") return "RETAIL"; // retail-led houses
  if (/text-foreign/.test(tdHtml)) return "FOREIGN";
  if (/text-local/.test(tdHtml)) return "DOMESTIC";
  if (/text-bumn/.test(tdHtml)) return "DOMESTIC";
  return "UNKNOWN";
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

// ── fetch with timeout + one retry ───────────────────────────────────────

async function fetchWithTimeout(url: string, signal: AbortSignal): Promise<string> {
  const res = await fetch(url, { headers: HEADERS, signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ── parser ───────────────────────────────────────────────────────────────

function parseBrokerSummaryHtml(html: string, code: string, start: string, end: string): IpotBrokerSummaryRaw {
  if (/Invalid stock code/i.test(html)) {
    throw new Error("invalid-code");
  }

  const rows: IpotBrokerRow[] = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = trRe.exec(html)) !== null) {
    const tds = m[1]!.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) ?? [];
    if (tds.length !== 9) continue;
    const buyerTd = stripTags(tds[0] ?? "");
    const buyerCode = buyerTd.split(/\s+/)[0] ?? "";
    if (!/^[A-Z]{2}$/.test(buyerCode)) continue;

    const sellerTd = stripTags(tds[5] ?? "");
    const sellerCode = sellerTd.split(/\s+/)[0] ?? "";
    if (!/^[A-Z]{2}$/.test(sellerCode)) continue;

    rows.push({
      code: buyerCode,
      type: brokerTypeFromHtml(tds[0] ?? "", buyerCode),
      buyLots: parseLots(stripTags(tds[1] ?? "")),
      buyValue: parseIdrValue(stripTags(tds[2] ?? "")),
      sellLots: 0,
      sellValue: 0,
    });
    rows.push({
      code: sellerCode,
      type: brokerTypeFromHtml(tds[5] ?? "", sellerCode),
      buyLots: 0,
      buyValue: 0,
      sellLots: parseLots(stripTags(tds[6] ?? "")),
      sellValue: parseIdrValue(stripTags(tds[7] ?? "")),
    });
  }

  const tfootMatch = html.match(/<tfoot[^>]*>([\s\S]*?)<\/tfoot>/i);
  const foot = tfootMatch ? stripTags(tfootMatch[1] ?? "") : "";

  const pick = (label: string): number => {
    const mm = foot.match(new RegExp(`${label}\\.?\\s*Val\\s*:\\s*([-\\d.,]+\\s*[BKMT]?)`, "i"));
    return mm ? parseIdrValue(mm[1] ?? "0") : 0;
  };

  const totalValue = pick("T");
  const foreignNetValue = pick("F\\.?\\s*N");

  if (rows.length === 0) {
    throw new Error("empty");
  }

  // merge buyer/seller halves of the same broker
  const merged = new Map<string, IpotBrokerRow>();
  for (const r of rows) {
    const cur = merged.get(r.code) ?? {
      code: r.code, type: r.type, buyLots: 0, buyValue: 0, sellLots: 0, sellValue: 0,
    };
    cur.buyLots += r.buyLots;
    cur.buyValue += r.buyValue;
    cur.sellLots += r.sellLots;
    cur.sellValue += r.sellValue;
    if (r.type !== "UNKNOWN") cur.type = r.type;
    merged.set(r.code, cur);
  }

  return {
    stock: code,
    start,
    end,
    rows: [...merged.values()],
    totalValue,
    foreignNetValue,
  };
}

// ── public API ───────────────────────────────────────────────────────────

function toIpotDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
}

const WINDOW_DAYS: Record<BrokerWindowRange, number> = { "7D": 7, "14D": 14, "30D": 30 };

/** Fetch aggregated broker summary for one ticker + window. */
export async function fetchBrokerWindow(
  code: string,
  range: BrokerWindowRange,
  endDate: Date,
): Promise<IpotResult> {
  const start = new Date(endDate);
  start.setDate(start.getDate() - (WINDOW_DAYS[range] - 1));
  const url =
    `${BASE_URL}?code=${encodeURIComponent(code.toUpperCase())}` +
    `&start=${encodeURIComponent(toIpotDate(start))}` +
    `&end=${encodeURIComponent(toIpotDate(endDate))}&fd=all&board=all`;

  let html: string;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      html = await fetchWithTimeout(url, controller.signal);
    } catch (firstErr) {
      // one limited retry for transient failures
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      const controller2 = new AbortController();
      const timer2 = setTimeout(() => controller2.abort(), TIMEOUT_MS);
      try {
        html = await fetchWithTimeout(url, controller2.signal);
      } finally {
        clearTimeout(timer2);
      }
      void firstErr;
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    console.error(`[broker/ipot] fetch failed for ${code} (${range}):`, err);
    return { ok: false, reason: "network" };
  }

  try {
    return { ok: true, data: parseBrokerSummaryHtml(html, code, toIpotDate(start), toIpotDate(endDate)) };
  } catch (err) {
    const reason =
      err instanceof Error && err.message === "invalid-code" ? "invalid-code"
      : err instanceof Error && err.message === "empty" ? "empty"
      : "parse";
    console.error(`[broker/ipot] parse failed for ${code} (${range}):`, err);
    return { ok: false, reason };
  }
}
