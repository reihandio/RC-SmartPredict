/**
 * IDX OFFICIAL scraper — corporate-action & announcement pages (the most
 * authoritative source, per Section 14).
 *
 * Source URLs / structure this module was written against (2026-08-20):
 *   https://www.idx.co.id/id/perusahaan-tercatat/aksi-korporasi
 *   https://www.idx.co.id/id/berita/pengumuman
 *   SPA data endpoint: POST https://www.idx.co.id/primary/ListedCompany/GetAnnouncements
 *   (undocumented JSON body — the public pages are Vue SPAs that load their
 *   lists via this endpoint, so server-rendered HTML alone never contains
 *   the announcement rows).
 *
 * BLOCKED at time of writing: www.idx.co.id serves a Cloudflare
 * "Attention Required" hard-block (HTTP 403) to non-browser clients — verified
 * from this machine on 2026-08-20 with full browser headers, for GET and POST
 * alike, and datacenter IPs (Vercel) are expected to be blocked the same way.
 *
 * This module attempts the fetch anyway and throws a descriptive error when
 * blocked, so the radar can say "IDX resmi diblokir" instead of silently
 * omitting the most authoritative source. If IDX ever relaxes the block, the
 * parser below starts contributing with no other change.
 *
 * Parsing strategy (only exercised if the block is lifted):
 *  - Announcement titles are explicit ("Keterbukaan Informasi terkait
 *    Pembelian Kembali Saham", "Pemanggilan RUPS Tahunan PT Bank Central
 *    Asia Tbk") — classify.ts keyword rules cover the phrasing.
 *  - Titles carry the company NAME, not the ticker, so tickers are resolved
 *    through COMPANY_NAMES (legal-name aliases per watched ticker, longest
 *    match wins). Announcement PDFs are never opened (Section 14: the title
 *    is enough).
 */
import { FEED_HEADERS, toJakartaDate, type FeedItem, type FeedSource } from "./rss.js";

export const IDX_SOURCE: FeedSource = {
  id: "IDX Resmi",
  url: "https://www.idx.co.id/id/berita/pengumuman",
};

const PAGES = [
  "https://www.idx.co.id/id/berita/pengumuman",
  "https://www.idx.co.id/id/perusahaan-tercatat/aksi-korporasi",
];

const TIMEOUT_MS = 15_000;

/**
 * Legal-name aliases per watched ticker (written against Yahoo Finance quote
 * names, 2026-08-20; IDX announcement titles use the same legal names).
 * Matching normalizes away "PT", "Tbk", "(Persero)" and punctuation; the
 * longest alias that appears in a title wins, so near-duplicate names like
 * "Astra Agro Lestari" vs "Astra International" disambiguate correctly.
 */
export const COMPANY_NAMES: Record<string, string[]> = {
  BBCA: ["Bank Central Asia"],
  BBRI: ["Bank Rakyat Indonesia"],
  BMRI: ["Bank Mandiri"],
  BBNI: ["Bank Negara Indonesia"],
  BRIS: ["Bank Syariah Indonesia"],
  ARTO: ["Bank Jago"],
  BBTN: ["Bank Tabungan Negara"],
  UNVR: ["Unilever Indonesia"],
  ICBP: ["Indofood CBP Sukses Makmur"],
  INDF: ["Indofood Sukses Makmur"],
  MYOR: ["Mayora Indah"],
  GGRM: ["Gudang Garam"],
  HMSP: ["Hanjaya Mandala Sampoerna", "HM Sampoerna"],
  ULTJ: ["Ultra Jaya Milk Industry", "Ultrajaya Milk"],
  CMRY: ["Cisarua Mountain Dairy"],
  AMRT: ["Sumber Alfaria Trijaya"],
  MIDI: ["Midi Utama Indonesia"],
  ACES: ["Aspirasi Hidup Indonesia", "Ace Hardware Indonesia"],
  MAPI: ["Mitra Adiperkasa"],
  ERAA: ["Erajaya Swasembada"],
  RALS: ["Ramayana Lestari Sentosa"],
  LPPF: ["Matahari Department Store"],
  ADRO: ["Alamtri Resources Indonesia", "Adaro Energy"],
  PTBA: ["Bukit Asam"],
  ITMG: ["Indo Tambangraya Megah"],
  INCO: ["Vale Indonesia"],
  ANTM: ["Aneka Tambang"],
  MDKA: ["Merdeka Copper Gold"],
  MEDC: ["Medco Energi Internasional"],
  PGAS: ["Perusahaan Gas Negara"],
  AKRA: ["AKR Corporindo"],
  ESSA: ["Essa Industries Indonesia"],
  HRUM: ["Harum Energy"],
  TINS: ["Timah"],
  DOID: ["Delta Dunia Makmur"],
  INDY: ["Indika Energy"],
  BREN: ["Barito Renewables Energy"],
  BRMS: ["Bumi Resources Minerals"],
  MBMA: ["Merdeka Battery Materials"],
  POWR: ["Cikarang Listrindo"],
  TLKM: ["Telkom Indonesia"],
  ISAT: ["Indosat Ooredoo Hutchison", "Indosat"],
  EXCL: ["XL Axiata"],
  MTEL: ["Dayamitra Telekomunikasi", "Mitratel"],
  TBIG: ["Tower Bersama Infrastructure"],
  TOWR: ["Sarana Menara Nusantara"],
  GOTO: ["GoTo Gojek Tokopedia"],
  EMTK: ["Elang Mahkota Teknologi"],
  DCII: ["DCI Indonesia"],
  SMGR: ["Semen Indonesia"],
  INTP: ["Indocement Tunggal Prakarsa"],
  WIKA: ["Wijaya Karya"],
  PTPP: ["Pembangunan Perumahan", "PP Persero"],
  ADHI: ["Adhi Karya"],
  JSMR: ["Jasa Marga"],
  WTON: ["Wijaya Karya Beton"],
  CTRA: ["Ciputra Development"],
  BSDE: ["Bumi Serpong Damai"],
  PWON: ["Pakuwon Jati"],
  LPKR: ["Lippo Karawaci"],
  APLN: ["Agung Podomoro Land"],
  SMRA: ["Summarecon Agung"],
  PANI: ["Pantai Indah Kapuk Dua"],
  SIDO: ["Industri Jamu dan Farmasi Sido Muncul", "Sido Muncul"],
  MIKA: ["Mitra Keluarga Karyasehat"],
  HEAL: ["Medikaloka Hermina"],
  KLBF: ["Kalbe Farma"],
  SCMA: ["Surya Citra Media"],
  MNCN: ["Media Nusantara Citra"],
  FILM: ["MD Pictures"],
  AALI: ["Astra Agro Lestari"],
  LSIP: ["PP London Sumatra Indonesia", "London Sumatra"],
  CPIN: ["Charoen Pokphand Indonesia"],
  JPFA: ["Japfa Comfeed Indonesia"],
  MAIN: ["Malindo Feedmill"],
  ASII: ["Astra International"],
  GJTL: ["Gajah Tunggal"],
  AVIA: ["Avia Avian"],
  BRPT: ["Barito Pacific"],
  TPIA: ["Chandra Asri Pacific"],
  INKP: ["Indah Kiat Pulp Paper"],
};

function normalizeName(text: string): string {
  return text
    .toLowerCase()
    .replace(/\bpt\b|\btbk\b|\bpersero\b|\(|\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Resolve a ticker from an announcement title via legal-name matching.
 *  Parenthesized ticker codes (rare on IDX) win over name matching.
 *  Caveat: an announcement BY company X about acquiring company Y resolves
 *  to Y — a known limitation of title-only parsing (Section 14 accepts it). */
export function resolveIdxTicker(title: string, knownCodes: Set<string>): string | null {
  const parens = title.match(/\(([A-Z]{4,5})\)/g) ?? [];
  for (const m of parens) {
    const code = m.slice(1, -1);
    if (knownCodes.has(code)) return code;
  }
  const haystack = normalizeName(title);
  let best: { ticker: string; length: number } | null = null;
  for (const [ticker, aliases] of Object.entries(COMPANY_NAMES)) {
    for (const alias of aliases) {
      const needle = normalizeName(alias);
      if (needle.length < 4) continue; // too short to be safe ("Timah" etc.)
      if (haystack.includes(needle) && (!best || needle.length > best.length)) {
        best = { ticker, length: needle.length };
      }
    }
  }
  return best?.ticker ?? null;
}

function isCloudflareBlock(status: number, body: string): boolean {
  return (
    status === 403 &&
    (body.includes("Attention Required") ||
      body.includes("Just a moment") ||
      body.includes("challenges.cloudflare.com"))
  );
}

/** Fetch one IDX page and extract announcement-looking entries. */
async function fetchPage(url: string): Promise<FeedItem[]> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { ...FEED_HEADERS, Accept: "text/html, */*" },
  });
  const body = await res.text();
  if (isCloudflareBlock(res.status, body)) {
    throw new Error("diblokir Cloudflare (403)");
  }
  if (!res.ok) {
    throw new Error(`IDX page returned HTTP ${res.status}`);
  }
  // The pages are Vue SPAs whose lists load over XHR, so a plain 200 HTML
  // response usually has no rows. If it ever does, pull title-like text out
  // of link/heading markup; dates default to today.
  const items: FeedItem[] = [];
  const rows = body.match(/<a[^>]*href="[^"]*"[^>]*>([\s\S]{15,200}?)<\/a>/gi) ?? [];
  for (const row of rows) {
    const text = row
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length < 15) continue;
    const link = row.match(/href="([^"]*)"/i)?.[1] ?? url;
    items.push({ title: text, link, date: toJakartaDate(new Date()) });
  }
  return items;
}

/**
 * Attempt both IDX pages. Throws a descriptive error when the domain is
 * blocked (the expected case today) so the aggregator can report it.
 */
export async function fetchIdxItems(knownCodes: Set<string>): Promise<FeedItem[]> {
  const settled = await Promise.allSettled(PAGES.map((p) => fetchPage(p)));
  const items = settled
    .filter((r): r is PromiseFulfilledResult<FeedItem[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);
  if (settled.every((r) => r.status === "rejected")) {
    const reason = settled[0].reason;
    throw new Error(reason instanceof Error ? reason.message : "IDX fetch failed");
  }
  return items.map((item) => {
    const tickerHint = resolveIdxTicker(item.title, knownCodes);
    return tickerHint ? { ...item, tickerHint } : item;
  });
}
