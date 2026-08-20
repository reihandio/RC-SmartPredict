/**
 * Keyword-based classification of corporate-action news (Section 14): maps a
 * headline to an action `type`, an `impact`, and a 0-100 catalyst `score`.
 * Deliberately rule-based (no ML) so the mapping table is easy to extend —
 * add a keyword row here and the feed picks up new types immediately.
 *
 * Type strings mirror CORPORATE_ACTION_TYPES in src/types/index.ts (kept in
 * sync manually; the server never value-imports from src/).
 */
import type { CorporateAction } from "../../src/types/index.js";
import type { FeedSource } from "./sources.js";

// ── type detection (ordered — first rule that matches wins) ──────────────
// Keywords cover both media headline style ("Akuisisi!") and official
// announcement style from IDX/POJK ("Keterbukaan Informasi terkait
// Pembelian Kembali Saham", "Pengambilalihan", "Penambahan Modal dengan
// Hak Memesan Efek Terlebih Dahulu"), so one classifier serves every source.

const TYPE_RULES: Array<{ type: string; keywords: string[] }> = [
  { type: "Right Issue", keywords: ["right issue", "rights issue", "rights offering", "hmetd", "put i", "put ii", "penambahan modal dengan hak memesan efek"] },
  { type: "Tender Offer", keywords: ["tender offer", "penawaran tender", "tender sukarela", "tender wajib", "mandatory tender"] },
  { type: "Private Placement", keywords: ["private placement", "penempatan saham", "non-preemptive", "pmthmetd", "penambahan modal tanpa hak memesan efek", "tanpa hak memesan efek terlebih dahulu"] },
  { type: "Stock Split", keywords: ["stock split", "reverse split", "split saham", "pemecahan saham", "pemecahan nilai nominal"] },
  { type: "Buyback", keywords: ["buyback", "buy back", "buy-back", "pembelian kembali saham", "pembelian kembali"] },
  { type: "Merger", keywords: ["merger", "penggabungan usaha", "penggabungan", "menggabungkan usaha"] },
  { type: "Acquisition", keywords: ["akuisisi", "mengakuisisi", "diakuisisi", "caplok", "mencaplok", "ambil alih", "mengambil alih", "akuisisi saham", "pengambilalihan"] },
  { type: "Dividend", keywords: ["dividen", "dividend"] },
  { type: "New Contract", keywords: ["kontrak baru", "peroleh kontrak", "perolehan kontrak", "raih kontrak", "dapat kontrak", "paket kontrak", "kontrak senilai"] },
  { type: "Expansion", keywords: ["ekspansi", "perluasan", "pabrik baru", "bangun pabrik", "perluas bisnis", "ekspansi bisnis", "perluas kapasitas", "penambahan kapasitas produksi", "penambahan lini produksi"] },
  { type: "Ownership Change", keywords: ["perubahan kepemilikan", "kepemilikan saham", "pengendali baru", "perubahan pengendali", "pemegang saham utama", "pemegang saham pengendali", "divestasi saham", "lepas saham", "pelepasan saham"] },
  { type: "Strategic Partnership", keywords: ["kemitraan strategis", "strategic partnership", "kerja sama", "kerjasama", "kolaborasi", "kemitraan"] },
  { type: "RUPS", keywords: ["rups", "rupslb", "rupst", "rapat umum pemegang saham", "pemanggilan rups", "rups tahunan", "rups luar biasa"] },
];

/** Default impact per type when no sentiment keyword overrides it. */
const DEFAULT_IMPACT: Record<string, CorporateAction["impact"]> = {
  Acquisition: "POSITIVE",
  Merger: "POSITIVE",
  "Tender Offer": "POSITIVE",
  Buyback: "POSITIVE",
  "New Contract": "POSITIVE",
  "Strategic Partnership": "POSITIVE",
  Expansion: "POSITIVE",
  Dividend: "POSITIVE",
  "Right Issue": "NEUTRAL",
  "Private Placement": "NEUTRAL",
  "Stock Split": "NEUTRAL",
  "Ownership Change": "NEUTRAL",
  RUPS: "NEUTRAL",
};

/** Catalyst base per type (0-100), before sentiment/recency adjustments. */
const BASE_SCORE: Record<string, number> = {
  Acquisition: 75,
  Merger: 75,
  "Tender Offer": 72,
  Buyback: 70,
  "New Contract": 70,
  "Strategic Partnership": 65,
  Expansion: 65,
  Dividend: 65,
  "Right Issue": 60,
  "Private Placement": 58,
  "Stock Split": 55,
  "Ownership Change": 55,
  RUPS: 50,
};

const NEGATIVE_KEYWORDS = [
  "anjlok", "turun", "tertekan", "melemah", "rugi", "kerugian", "gagal",
  "ditunda", "batal", "dibatalkan", "koreksi", "sanksi", "denda", "pailit",
  "delisting", "suspensi", "pengadilan", "tersangkut", "korupsi", "digugat",
];
const POSITIVE_KEYWORDS = [
  "menguat", "melonjak", "melesat", "cuan", "rekor", "laba", "untung",
  "meningkat", "tumbuh", "mendorong", "optimistis", "kabarkan", "siapkan",
];

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Short keywords must match on word boundaries: "rups" must not fire
 *  inside "korupsi" or "erupsi". Longer phrases are specific enough to use
 *  a plain substring match. */
function containsKeyword(haystack: string, keyword: string): boolean {
  if (keyword.length <= 4) {
    return new RegExp(`(^|[^a-z])${escapeRegExp(keyword)}([^a-z]|$)`, "i").test(haystack);
  }
  return haystack.includes(keyword);
}

export function detectType(title: string): string | null {
  const lower = title.toLowerCase();
  for (const rule of TYPE_RULES) {
    if (rule.keywords.some((k) => containsKeyword(lower, k))) return rule.type;
  }
  return null;
}

/**
 * Extract a ticker code from a headline. Only codes in the accepted IDX
 * universe (full listed snapshot + watchlist, see service.ts) are accepted,
 * which keeps false positives (BEI, OJK, IHSG, and bare uppercase words that
 * are not real tickers) out of the radar. Parenthesized codes — "(BBCA)" —
 * are the highest-confidence match and win over bare tokens.
 */
export function extractTicker(title: string, knownCodes: Set<string>): string | null {
  const parens = title.match(/\(([A-Z]{4,5})\)/g) ?? [];
  for (const m of parens) {
    const code = m.slice(1, -1);
    if (knownCodes.has(code)) return code;
  }
  const tokens = title.match(/[A-Z]{4,5}/g) ?? [];
  for (const code of tokens) {
    if (knownCodes.has(code)) return code;
  }
  return null;
}

/** Classify one news headline into a CorporateAction, or null if it does not
 *  look like a corporate action (no known type, ticker, or too old).
 *  `hints` carries source-provided type/ticker knowledge (topic pages, IDX
 *  name→code maps) used only when the headline alone is not conclusive. */
export function classifyNews(
  title: string,
  link: string,
  date: string,
  source: FeedSource,
  knownCodes: Set<string>,
  today: string,
  hints?: { type?: string; ticker?: string },
): CorporateAction | null {
  const type = detectType(title) ?? hints?.type ?? null;
  const ticker = hints?.ticker ?? extractTicker(title, knownCodes);
  if (!type || !ticker) return null;

  const daysAgo = (new Date(today).getTime() - new Date(`${date}T00:00:00Z`).getTime()) / 86400e3;
  if (daysAgo > 21 || daysAgo < -1) return null; // radar covers the last 3 weeks

  const lower = title.toLowerCase();
  const negative = NEGATIVE_KEYWORDS.some((k) => lower.includes(k));
  const positive = POSITIVE_KEYWORDS.some((k) => lower.includes(k));

  const impact: CorporateAction["impact"] = negative
    ? "NEGATIVE"
    : positive && DEFAULT_IMPACT[type] === "POSITIVE"
      ? "POSITIVE"
      : (DEFAULT_IMPACT[type] ?? "NEUTRAL");

  let score = BASE_SCORE[type] ?? 55;
  if (negative) score -= 35;
  else if (positive) score += 10;
  if (daysAgo <= 2) score += 5;
  else if (daysAgo <= 7) score += 2;
  score = Math.round(clamp(score, 5, 95));

  return {
    id: `news-${source.id}-${link}`,
    ticker,
    companyName: "", // feed headlines rarely carry the legal name; UI omits it
    date,
    type,
    description: title,
    impact,
    score,
    source: source.id,
    sourceUrl: link,
  };
}
