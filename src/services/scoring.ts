/**
 * Scoring constants shared by the client (labels, bands).
 * The actual score computation runs server-side in server/analytics.ts
 * against real OHLCV data — these mirrors keep the UI in sync.
 */
import type { RiskLevel } from "../types";

/** Anomaly risk banding (spec: LOW / MODERATE / ELEVATED / HIGH). */
export function riskLevel(r: number): RiskLevel {
  if (r <= 20) return "LOW";
  if (r <= 40) return "MODERATE";
  if (r <= 60) return "ELEVATED";
  return "HIGH";
}

/** Whether a stock clears the default Rp 1T market-cap gate. */
export function above1Trillion(marketCap: number): boolean {
  return marketCap >= 1e12;
}

/** Money-flow acceleration: short window vs long window (%). */
export function flowAcceleration(s: { moneyFlow5d: number; moneyFlow20d: number }): number {
  return Math.round((s.moneyFlow5d - s.moneyFlow20d) * 10) / 10;
}

/** True when the short-window flow is clearly outpacing the long window. */
export function isAccelerating(s: { moneyFlow5d: number; moneyFlow20d: number }): boolean {
  return s.moneyFlow5d > 0 && s.moneyFlow5d > s.moneyFlow20d + 10;
}
