/**
 * Volume Authenticity scoring (Section 13b) — pure functions, no I/O.
 *
 * Distinguishes genuine volume from suspicious/wash-trading-like volume using
 * ONLY what the free daily-bar source (Yahoo OHLCV) provides. Two of the
 * spec's signals — transaction frequency ratio and bid-offer spread — need
 * tick/trade data that this source does not expose; those fields are
 * returned as null and the UI says "not available" instead of inventing a
 * number.
 *
 * Wording rules: flags say "unusual trading pattern", never "manipulated".
 */
import type { VolumeAuthenticity } from "../src/types/index.js";
import type { YahooBar } from "./yahoo.js";

export interface VolumeAuthenticityOptions {
  /** Broker accumulation score (Section 13a) when available; null = unknown. */
  brokerAccumulationScore?: number | null;
  brokerTier?: string | null;
  /** Market cap (IDR) for the "single-day volume vs free float" proxy; 0 = unknown. */
  marketCap?: number;
}

const clamp = (v: number, min = 0, max = 100): number => Math.min(max, Math.max(min, v));

function avgVolumeBefore(bars: YahooBar[], idx: number, n = 20): number {
  const start = Math.max(0, idx - n);
  if (idx - start < 5) return 0;
  let sum = 0;
  for (let i = start; i < idx; i++) sum += bars[i]!.volume;
  return sum / (idx - start);
}

interface SpikeInfo {
  idx: number;
  ratio: number; // volume vs prior 20-session average
  changePct: number; // close-to-close %
}

/** Volume spikes (≥2× the prior 20-session average) in the last 30 sessions. */
function findSpikes(bars: YahooBar[]): SpikeInfo[] {
  const spikes: SpikeInfo[] = [];
  for (let i = bars.length - 30; i < bars.length; i++) {
    const b = bars[i];
    const prev = bars[i - 1];
    if (!b || !prev) continue;
    const avg = avgVolumeBefore(bars, i);
    if (avg <= 0) continue;
    const ratio = b.volume / avg;
    if (ratio < 2) continue;
    spikes.push({
      idx: i,
      ratio,
      changePct: ((b.close - prev.close) / prev.close) * 100,
    });
  }
  return spikes;
}

/** Did the price hold (not fall back) for 2-3 sessions after a spike? */
function heldAfter(bars: YahooBar[], spikeIdx: number): boolean {
  const base = bars[spikeIdx]?.close;
  if (base === undefined) return false;
  for (let k = 1; k <= 3; k++) {
    const c = bars[spikeIdx + k]?.close;
    if (c === undefined) return true; // too recent to judge — don't penalize
    if (c < base * 0.97) return false;
  }
  return true;
}

/** Pump-and-dump-like: spike up sharply then immediate reversal. */
function pumpDumpAt(bars: YahooBar[], s: SpikeInfo): boolean {
  if (s.changePct < 3) return false;
  const next = bars[s.idx + 1];
  if (!next) return false;
  const base = bars[s.idx]!;
  return (next.close - base.close) / base.close < -0.015;
}

export function volumeAuthenticity(
  bars: YahooBar[],
  opts: VolumeAuthenticityOptions = {},
): VolumeAuthenticity {
  const redFlags: string[] = [];
  let score = 60; // neutral baseline

  if (bars.length < 25) {
    // Not enough history — be honest, not extreme.
    return {
      ticker: "",
      score: 50,
      classification: "SUSPICIOUS",
      frequencyToVolumeRatio: null,
      priceHeldAfterSpike: false,
      spreadStability: null,
      correlatesWithBrokerAccumulation:
        opts.brokerAccumulationScore === null || opts.brokerAccumulationScore === undefined
          ? null
          : (opts.brokerAccumulationScore >= 55 && opts.brokerTier !== "C"),
      redFlags: ["Insufficient history to assess volume authenticity"],
    };
  }

  const spikes = findSpikes(bars);
  const lastSpike = spikes[spikes.length - 1];

  // ── genuine signals ────────────────────────────────────────────────────
  if (lastSpike) {
    if (heldAfter(bars, lastSpike.idx)) {
      score += 12;
    } else {
      score -= 10;
      redFlags.push("Volume spike with immediate price reversal (pump-and-dump pattern)");
    }

    // spike on a flat close: high volume, no price movement
    if (Math.abs(lastSpike.changePct) < 0.5) {
      score -= 12;
      redFlags.push("High volume with flat close — unusual trading pattern");
    }

    if (pumpDumpAt(bars, lastSpike)) {
      score -= 18;
      redFlags.push("Sharp spike followed by same-day/next-day reversal");
    }
  }

  // repeated pump-and-dump history
  const pumpDumpCount = spikes.filter((s) => pumpDumpAt(bars, s)).length;
  if (pumpDumpCount >= 3) {
    score -= 15;
    redFlags.push("Repeated history of pump-and-dump-like cycles");
  }

  // single-day volume vs market cap (proxy for free float, which is unavailable)
  const last = bars[bars.length - 1];
  if (opts.marketCap && opts.marketCap > 0 && last) {
    const valueTraded = last.close * last.volume;
    const pctMcap = (valueTraded / opts.marketCap) * 100;
    if (pctMcap > 5) {
      score -= 12;
      redFlags.push("Single-day turnover exceeds ~5% of market cap (low free-float proxy)");
    }
  }

  // broker story: does the volume have a corresponding accumulation pattern?
  const brokerScore = opts.brokerAccumulationScore ?? null;
  const hasBrokerStory = brokerScore !== null && brokerScore >= 55 && opts.brokerTier !== "C";
  const noBrokerStory = brokerScore !== null && (brokerScore < 55 || opts.brokerTier === "C");
  if (noBrokerStory) {
    score -= 12;
    redFlags.push("Volume with no corresponding broker accumulation pattern");
  }

  // general: negative-close volume dominance in the last 10 sessions
  let upVol = 0;
  let downVol = 0;
  for (let i = bars.length - 10; i < bars.length; i++) {
    const b = bars[i];
    const p = bars[i - 1];
    if (!b || !p) continue;
    if (b.close >= p.close) upVol += b.volume;
    else downVol += b.volume;
  }
  if (upVol + downVol > 0 && downVol / (upVol + downVol) > 0.65) {
    score -= 8;
    redFlags.push("Recent volume concentrated on down sessions");
  }

  score = Math.round(clamp(score));

  return {
    ticker: "",
    score,
    classification: score >= 60 ? "GENUINE" : "SUSPICIOUS",
    frequencyToVolumeRatio: null, // needs tick data — not available from daily bars
    priceHeldAfterSpike: lastSpike ? heldAfter(bars, lastSpike.idx) : true,
    spreadStability: null, // needs bid/offer data — not available from daily bars
    correlatesWithBrokerAccumulation: hasBrokerStory,
    redFlags,
  };
}
