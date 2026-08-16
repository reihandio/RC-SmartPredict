/**
 * Signal explainability — every signal must explain WHY.
 * All numbers come from real computed values (server-side analytics);
 * nothing here is invented. Language describes potential setups, never
 * certainties ("accumulation-like", "unusual trading pattern").
 */
import type { IntelligenceReport, ScoredStock, StockDetail } from "../types";
import { riskLevel } from "./scoring";

/** Positive evidence — only facts that hold for this stock's real data. */
export function buildReasons(s: ScoredStock): string[] {
  const reasons: string[] = [];

  if (s.moneyFlow10d >= 25) {
    reasons.push(`Money Flow Proxy up ${Math.round(s.moneyFlow10d)}% over 10 sessions`);
  }
  if (s.moneyFlow5d >= 20) {
    reasons.push(`Money Flow Proxy accelerating — up ${Math.round(s.moneyFlow5d)}% over 5 sessions`);
  }
  if (s.volumeRatio >= 1.4) {
    reasons.push(`Volume is ${s.volumeRatio.toFixed(1)}× the 20-session average`);
  }
  if (s.accumulationScore >= 70) {
    reasons.push("Accumulation-like behavior detected (up-day volume dominates)");
  }
  if (s.technicalScore >= 70) {
    reasons.push("Price above major moving averages with positive trend structure");
  }
  if (s.relativeStrength >= 3) {
    reasons.push(`Outperforming IHSG by ${s.relativeStrength.toFixed(1)}% over 20 sessions`);
  }
  if (s.catalystScore >= 70) {
    reasons.push("Recent corporate event detected (dividend / stock split)");
  }
  if (s.marketCap >= 1e12) {
    reasons.push("Market cap above Rp 1T");
  }
  if (s.rsi >= 52 && s.rsi <= 68 && s.technicalScore >= 55) {
    reasons.push(`Momentum building (RSI ${Math.round(s.rsi)})`);
  }
  if (s.priceVs52w >= 80) {
    reasons.push(`Trading near the top of its 52-week range (${s.priceVs52w}%)`);
  }

  if (reasons.length === 0) {
    reasons.push("No strong positive evidence in the current setup");
  }
  return reasons;
}

/** Caution flags — observations from real data, never accusations. */
export function buildRisks(s: ScoredStock): string[] {
  const risks: string[] = [];

  if (s.rsi > 72) {
    risks.push(`RSI at ${Math.round(s.rsi)} — approaching overbought`);
  }
  if (s.anomalyRisk >= 40) {
    risks.push("Unusual trading pattern detected");
  }
  if (s.volumeRatio >= 3) {
    risks.push(`Extreme volume spike (${s.volumeRatio.toFixed(1)}× average)`);
  }
  if (s.moneyFlow10d <= -15) {
    risks.push(`Distribution-like flow — down ${Math.abs(Math.round(s.moneyFlow10d))}% over 10 sessions`);
  }
  if (s.relativeStrength <= -6) {
    risks.push(`Underperforming IHSG by ${Math.abs(s.relativeStrength).toFixed(1)}% over 20 sessions`);
  }
  if (s.priceVs52w <= 15) {
    risks.push(`Trading near the bottom of its 52-week range (${s.priceVs52w}%)`);
  }
  if (s.anomalyRisk >= 61) {
    risks.push("Elevated anomaly risk — high volatility and/or low liquidity");
  }

  if (risks.length === 0) {
    risks.push("No major caution flags in the current setup");
  }
  return risks;
}

/** Full explainability report for a stock (detail page). */
export function buildIntelligenceReport(
  s: ScoredStock | StockDetail,
  catalystNote?: string,
): IntelligenceReport {
  const reasons = buildReasons(s);
  const risks = buildRisks(s);
  if (catalystNote) {
    if (s.catalystScore >= 70) reasons.unshift(catalystNote);
    else risks.unshift(catalystNote);
  }
  return { signal: s.signal, reasons, risks };
}

export { riskLevel };
