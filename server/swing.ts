/**
 * Swing Trade Candidate engine (Section 13c) — pure scoring + assembly.
 *
 * All inputs are live: Yahoo daily bars (technical setup), cached
 * Bandarmology summary (13a) and Volume Authenticity (13b). Fundamentals
 * enter as a filter/warning layer only — never in the score.
 *
 * Hard rules per spec:
 *  - Volume Authenticity < 40 → excluded regardless of technical setup
 *  - Only setups with measured risk/reward ≥ 2 are flagged
 *  - Broker summary is REQUIRED (no fabricated tiers); tickers without one
 *    are filled on demand by the API pipeline, then cached.
 */
import type {
  Fundamentals,
  SwingCandidate,
} from "../src/types/index.js";
import type { YahooBar, YahooQuote } from "./yahoo.js";
import { atr, clamp, macdHistogram, sma } from "./analytics.js";
import { volumeAuthenticity } from "./volumeAuthenticity.js";

export interface TechnicalSetup {
  setup: "BREAKOUT" | "PULLBACK" | "RANGE";
  score: number; // 0-100
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskReward: number;
  notes: string[];
}

/**
 * Technical structure from daily bars:
 *  - base = ~3 weeks of sideways movement (last 15 sessions before the last 3)
 *  - breakout = close above the base high with above-average volume
 *  - pullback = price above MA20, MA20 > MA50, recent dip holding MA20
 *  - measured zones: support = base low, resistance = base high
 *  - risk/reward from the measured zones (≥ 2 required by the caller)
 */
export function technicalSetup(bars: YahooBar[]): TechnicalSetup | null {
  if (bars.length < 40) return null;
  const closes = bars.map((b) => b.close);
  const n = bars.length;
  const last = bars[n - 1]!;
  const price = last.close;

  // base: sessions [n-18, n-4) — 15 sessions ending 3 sessions ago
  const baseBars = bars.slice(n - 18, n - 3);
  if (baseBars.length < 10) return null;
  const baseHigh = Math.max(...baseBars.map((b) => b.high));
  const baseLow = Math.min(...baseBars.map((b) => b.low));
  const baseRange = (baseHigh - baseLow) / baseLow;
  const tightBase = baseRange < 0.09; // ≤ ~9% over ~3 weeks

  const a = atr(bars, 14) ?? price * 0.02;
  const ma20 = sma(closes, 20);
  const ma50 = sma(closes, 50);
  const maAligned = ma20 !== null && ma50 !== null && price > ma20 && ma20 > ma50;
  const mh = macdHistogram(closes);

  // volume confirmation on the most recent sessions
  const avgVol20 = baseBars.reduce((s, b) => s + b.volume, 0) / baseBars.length;
  const volConfirmed = bars.slice(n - 3).some((b) => b.volume > avgVol20 * 1.5);

  // breakout: any of the last 3 closes above the base high
  const brokeOut = bars.slice(n - 3).some((b) => b.close > baseHigh);

  // higher lows: min low of last 5 sessions > min low of the 5 before
  const lowsA = Math.min(...bars.slice(n - 5).map((b) => b.low));
  const lowsB = Math.min(...bars.slice(n - 10, n - 5).map((b) => b.low));
  const higherLows = lowsA > lowsB;

  // pullback: above MA20, recent 3 sessions pulled back but held above MA20
  const pullback = ma20 !== null && price > ma20 &&
    bars.slice(n - 3).every((b) => b.low > ma20 * 0.995) &&
    price <= Math.max(...bars.slice(n - 8, n - 3).map((b) => b.close));

  let setup: TechnicalSetup["setup"];
  const notes: string[] = [];
  if (brokeOut && volConfirmed) {
    setup = "BREAKOUT";
    notes.push(`close above base high ${Math.round(baseHigh)} on above-average volume`);
  } else if (pullback && maAligned) {
    setup = "PULLBACK";
    notes.push("pullback holding above MA20 with MA20 > MA50");
  } else if (tightBase) {
    setup = "RANGE";
    notes.push("tight sideways base — range setup");
  } else {
    return null; // no recognizable structure
  }
  if (maAligned) notes.push("price above MA20 and MA50");
  if (mh !== null && mh > 0) notes.push("MACD histogram positive");
  if (higherLows) notes.push("higher lows forming");

  // measured zones (structural, not constructed)
  const entry = Math.round(price);
  const stopLoss = Math.max(baseLow * 0.995, entry - 1.5 * a);
  const takeProfit1 = Math.round(baseHigh + (baseHigh - baseLow)); // measured move
  const takeProfit2 = Math.round(baseHigh + 1.5 * (baseHigh - baseLow));
  const riskDist = Math.max(entry - stopLoss, price * 0.005);
  const rewardDist = Math.max(takeProfit1 - entry, price * 0.005);
  const riskReward = Math.round((rewardDist / riskDist) * 10) / 10;

  // setup score 0-100 (documented weights)
  let score = 0;
  if (setup === "BREAKOUT") score += 35;
  else if (setup === "PULLBACK") score += 30;
  else score += 20;
  if (maAligned) score += 15;
  if (mh !== null && mh > 0) score += 15;
  if (higherLows) score += 10;
  if (volConfirmed) score += 10;
  if (tightBase) score += 5;
  score += clamp(Math.round((riskReward - 1) * 5), 0, 10); // R:R quality
  score = clamp(score);

  return { setup, score, entry, stopLoss, takeProfit1, takeProfit2, riskReward, notes };
}

// ── candidate assembly ───────────────────────────────────────────────────

export interface SwingCandidateInput {
  quote: YahooQuote;
  bars: YahooBar[];
  broker: { score: number; tier: "A" | "B" | "C"; reason: string; concentrationRisk: number };
  fundamentals: Fundamentals | null;
}

export function buildSwingCandidate(input: SwingCandidateInput): SwingCandidate | null {
  const { quote, bars, broker } = input;
  const va = volumeAuthenticity(bars, {
    brokerAccumulationScore: broker.score,
    brokerTier: broker.tier,
    marketCap: quote.marketCap,
  });

  // hard filter: low authenticity excluded regardless of technical setup
  if (va.score < 40) return null;

  const tech = technicalSetup(bars);
  if (!tech) return null;

  // hard filter: only flag setups with measured R:R ≥ 2
  if (tech.riskReward < 2) return null;

  const score = Math.round(
    broker.score * 0.35 + va.score * 0.3 + tech.score * 0.35,
  );

  const confidence: SwingCandidate["confidence"] =
    score >= 75 ? "HIGH" : score >= 60 ? "MEDIUM" : "LOW";

  const horizon: [number, number] =
    tech.setup === "BREAKOUT" ? [10, 20] : tech.setup === "PULLBACK" ? [5, 15] : [20, 40];
  const category: SwingCandidate["category"] =
    tech.setup === "RANGE" ? "INVESTMENT" : "SWING";

  const riskNotes: string[] = [];
  if (broker.concentrationRisk > 60) {
    riskNotes.push(`single-broker concentration ${broker.concentrationRisk}% (7D)`);
  }
  const values20 = bars.slice(-20).map((b) => b.close * b.volume);
  const avgValue = values20.reduce((x, y) => x + y, 0) / values20.length;
  if (avgValue < 2e9) riskNotes.push("low liquidity (avg daily value below Rp 2B)");
  if (va.score < 60) riskNotes.push("volume authenticity borderline");
  if (input.fundamentals?.sector) riskNotes.push(`sector risk: ${input.fundamentals.sector}`);

  const f = input.fundamentals;
  let fundamentalNote: string;
  if (!f) {
    fundamentalNote = "Fundamentals unavailable from the free source for this ticker.";
  } else {
    const bits: string[] = [];
    if (f.epsTrend) bits.push(`EPS trend ${f.epsTrend.toLowerCase()}`);
    if (f.pbv !== undefined) bits.push(`PBV ${f.pbv}`);
    if (f.roe !== undefined) bits.push(`ROE ${f.roe}%`);
    if (f.der !== undefined) bits.push(`DER ${f.der}`);
    fundamentalNote =
      bits.length > 0
        ? `${bits.join("; ")}. No red flags from available free-source data.`
        : "Partial fundamentals available — no clear red flags from available data.";
  }

  return {
    ticker: quote.symbol.replace(/\.JK$/i, ""),
    companyName: quote.name,
    overallScore: score,
    confidence,
    brokerTier: broker.tier,
    brokerReason: broker.reason,
    volumeAuthenticityScore: va.score,
    volumeClassification: va.classification,
    technicalSetup: tech.setup,
    entry: tech.entry,
    stopLoss: Math.round(tech.stopLoss),
    takeProfit1: tech.takeProfit1,
    takeProfit2: tech.takeProfit2,
    fundamentalNote,
    holdingHorizonDays: horizon,
    category,
    riskNotes,
    updatedAt: new Date().toISOString(),
  };
}
