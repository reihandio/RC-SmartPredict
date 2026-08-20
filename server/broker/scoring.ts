/**
 * Bandarmology scoring — pure functions (unit-testable, no I/O).
 *
 * Section 13a tier rules (verbatim intent):
 *  Tier A (Strong): consistent net buying across 7/14/30D, intensity
 *    increasing in the last 7 days, low seller concentration, price still
 *    relatively flat/sideways.
 *  Tier B (Moderate): accumulation visible over 14/30D but last 7D show
 *    profit-taking or mixed signals.
 *  Tier C (Weak/Suspicious): accumulation only in the last 1-2 days
 *    (approximated by 7D dominance with no 14/30D pattern), single-broker
 *    dominance >60%, no multi-week pattern.
 *
 * Wording rules: "accumulation detected", never "institutions are buying".
 */
import type {
  BrokerAccumulationSummary,
  BrokerNetActivity,
  BrokerParty,
  BrokerTier,
  BrokerWindow,
  BrokerWindowRange,
} from "../../src/types/index.js";
import type { IpotBrokerSummaryRaw } from "./ipotSource.js";
import { brokerName } from "./names.js";

// ── window building ──────────────────────────────────────────────────────

function netOf(row: IpotBrokerSummaryRaw["rows"][number]): number {
  return row.buyValue - row.sellValue;
}

function toActivity(
  row: IpotBrokerSummaryRaw["rows"][number],
  marketCap: number,
): BrokerNetActivity {
  return {
    brokerCode: row.code,
    brokerName: brokerName(row.code),
    brokerType:
      row.type === "FOREIGN" ? "FOREIGN"
      : row.type === "DOMESTIC" ? "DOMESTIC"
      : row.type === "RETAIL" ? "RETAIL"
      : "UNKNOWN",
    netVolume: row.buyLots - row.sellLots,
    netValue: netOf(row),
    buyVolume: row.buyLots,
    sellVolume: row.sellLots,
    // proxy estimate, clearly labeled in UI: |net value| vs market cap
    ownershipPercent:
      marketCap > 0 ? Math.round((Math.abs(netOf(row)) / marketCap) * 1000) / 10 : 0,
  };
}

export function buildWindow(
  range: BrokerWindowRange,
  raw: IpotBrokerSummaryRaw,
  marketCap: number,
): BrokerWindow {
  const acts = raw.rows
    .map((r) => toActivity(r, marketCap))
    .filter((a) => a.buyVolume > 0 || a.sellVolume > 0);

  const topNetBuyers = [...acts]
    .filter((a) => a.netValue > 0)
    .sort((a, b) => b.netValue - a.netValue)
    .slice(0, 5);

  const topNetSellers = [...acts]
    .filter((a) => a.netValue < 0)
    .sort((a, b) => a.netValue - b.netValue)
    .slice(0, 5);

  return {
    range,
    topNetBuyers,
    topNetSellers,
    totalValue: raw.totalValue,
    foreignNetValue: raw.foreignNetValue,
  };
}

// ── consistency / concentration ──────────────────────────────────────────

/** Brokers that are net buyers in BOTH given windows (intersection). */
function overlappingBuyers(a: BrokerWindow, b: BrokerWindow): string[] {
  const codesA = new Set(a.topNetBuyers.map((x) => x.brokerCode));
  return b.topNetBuyers.filter((x) => codesA.has(x.brokerCode)).map((x) => x.brokerCode);
}

/** 7D window dominance of its single largest buyer, as % of 7D top-5 net buying. */
function concentration7d(w7: BrokerWindow): number {
  const total = w7.topNetBuyers.reduce((s, x) => s + x.netValue, 0);
  const top = w7.topNetBuyers[0]?.netValue ?? 0;
  if (total <= 0) return 100;
  return Math.round((top / total) * 100);
}

/** Foreign-led vs domestic-led vs mixed vs unidentified, from top buyers across all windows. */
function dominantParty(windows: BrokerWindow[]): BrokerParty {
  const all = windows.flatMap((w) => w.topNetBuyers);
  if (all.length === 0) return "UNIDENTIFIED";
  let foreign = 0;
  let domestic = 0;
  for (const b of all) {
    if (b.brokerType === "FOREIGN") foreign++;
    else if (b.brokerType === "DOMESTIC") domestic++;
  }
  if (foreign === 0 && domestic === 0) return "UNIDENTIFIED";
  if (foreign > domestic * 1.5) return "FOREIGN";
  if (domestic > foreign * 1.5) return "DOMESTIC_INSTITUTION";
  return "MIXED";
}

// ── tier + score ─────────────────────────────────────────────────────────

interface TierInput {
  windows: BrokerWindow[]; // [7D, 14D, 30D]
  /** 20-session % return — optional, used only for the "price still sideways" sub-rule. */
  priceChange20dPct?: number | null;
}

export interface TierResult {
  tier: BrokerTier;
  score: number;
  reason: string;
  consistentAcrossWindows: boolean;
  dominantParty: BrokerParty;
  concentrationRisk: number;
}

const WINDOW_ORDER: BrokerWindowRange[] = ["7D", "14D", "30D"];

export function scoreTier(input: TierInput): TierResult {
  const byRange = new Map(input.windows.map((w) => [w.range, w]));
  const w7 = byRange.get("7D")!;
  const w14 = byRange.get("14D")!;
  const w30 = byRange.get("30D")!;

  const overlap7_14 = overlappingBuyers(w7, w14);
  const overlap7_30 = overlappingBuyers(w7, w30);
  const overlap14_30 = overlappingBuyers(w14, w30);
  const consistent = overlap7_14.length > 0 && overlap7_30.length > 0;

  // "7D intensity increasing": share of total 30D net buying that happened in the last 7 days
  const net30 = w30.topNetBuyers.reduce((s, x) => s + x.netValue, 0);
  const net14 = w14.topNetBuyers.reduce((s, x) => s + x.netValue, 0);
  const net7 = w7.topNetBuyers.reduce((s, x) => s + x.netValue, 0);
  const accelerating =
    net30 > 0 && net14 > 0 && net7 > 0 && (net7 / net30) > 0.45 && (net7 / net14) > 0.55;

  const conc = concentration7d(w7);
  const dominated = conc > 60;

  // Tier C: recent-only flow — 7D buys exist but 14D/30D show (near) nothing
  const recentOnly =
    net7 > 0 && (net30 <= 0 || net7 / Math.max(net30, 1) > 2.5) && overlap14_30.length === 0;

  // "price still sideways": |20d return| below ~10%
  const sideways = input.priceChange20dPct === undefined || input.priceChange20dPct === null
    ? true // unknown → don't penalize
    : Math.abs(input.priceChange20dPct) < 10;

  let tier: BrokerTier;
  if (consistent && (accelerating || net7 > 0) && !dominated && sideways) {
    tier = "A";
  } else if (recentOnly || dominated) {
    tier = "C";
  } else if ((overlap14_30.length > 0 && !consistent) || (!accelerating && net14 > 0)) {
    tier = "B";
  } else {
    tier = "C";
  }

  // ── score 0-100 (documented formula) ───────────────────────────────────
  let score = 0;
  if (w30.topNetBuyers.length > 0) score += 25; // multi-week net buying exists
  if (consistent) score += 20;
  if (accelerating) score += 15;
  if (!dominated) score += 10; // healthy concentration
  else score -= 20;
  if (net7 > 0) score += 10;
  if (w7.foreignNetValue > 0) score += 5; // foreign participation
  const sellerCount = w7.topNetSellers.length;
  score += Math.max(0, 10 - sellerCount * 2); // low seller concentration
  score = Math.max(0, Math.min(100, score));

  const topCodes = w7.topNetBuyers.slice(0, 3).map((b) => b.brokerCode).join(", ");

  const reasons: string[] = [];
  if (consistent) {
    reasons.push(
      `consistent net buying across 7/14/30D by ${[...new Set([...overlap7_14, ...overlap7_30])].slice(0, 3).join(", ")}`,
    );
  }
  if (accelerating) reasons.push("7D net-buy intensity increasing");
  if (dominated) reasons.push(`single-broker dominance ${conc}% (7D)`);
  if (recentOnly) reasons.push("flow concentrated in the most recent days, no multi-week pattern");
  if (!sideways) reasons.push("price already moved beyond sideways range");
  if (w7.foreignNetValue > 0) reasons.push("foreign net buying detected");
  if (topCodes) reasons.push(`7D top buyers: ${topCodes}`);

  return {
    tier,
    score,
    reason: reasons.length ? reasons.join("; ") : "insufficient broker activity for a pattern",
    consistentAcrossWindows: consistent,
    dominantParty: dominantParty(input.windows),
    concentrationRisk: conc,
  };
}

// ── summary assembly ─────────────────────────────────────────────────────

export function buildBrokerAccumulationSummary(input: {
  ticker: string;
  windows: BrokerWindow[];
  priceChange20dPct?: number | null;
  updatedAt: string;
}): BrokerAccumulationSummary {
  const sorted = WINDOW_ORDER
    .map((r) => input.windows.find((w) => w.range === r))
    .filter((w): w is BrokerWindow => Boolean(w));

  if (sorted.length < 3) {
    // defensive: caller must provide all three windows
    throw new Error("broker summary requires 7D/14D/30D windows");
  }

  const t = scoreTier({
    windows: sorted,
    priceChange20dPct: input.priceChange20dPct,
  });

  return {
    ticker: input.ticker,
    windows: sorted,
    consistentAcrossWindows: t.consistentAcrossWindows,
    dominantParty: t.dominantParty,
    concentrationRisk: t.concentrationRisk,
    tier: t.tier,
    tierReason: t.reason,
    score: t.score,
    updatedAt: input.updatedAt,
    source: "LIVE",
  };
}
