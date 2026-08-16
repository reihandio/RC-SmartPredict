/**
 * Core domain types — REAL market data via the Yahoo Finance provider.
 * All analytics values are derived server-side from actual OHLCV data.
 */

export type Signal =
  | "STRONG BUY"
  | "BUY"
  | "WATCH"
  | "HOLD"
  | "REDUCE"
  | "SELL"
  | "AVOID";

export type RiskLevel = "LOW" | "MODERATE" | "ELEVATED" | "HIGH";

export type TimeRange = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y";

/** A scored stock — quotes from Yahoo, analytics derived from real OHLCV. */
export interface ScoredStock {
  symbol: string; // e.g. "BBRI.JK"
  ticker: string; // e.g. "BBRI"
  companyName: string;

  // Real quote data
  price: number;
  changePercent: number;
  prevClose: number;
  volume: number;
  avgVolume: number; // 3-month average volume
  volumeRatio: number; // volume / 20d avg volume (computed from history)
  marketCap: number;
  high52: number;
  low52: number;

  // Derived analytics (Money Flow Proxy etc.)
  moneyFlowScore: number; // 0-100
  moneyFlow5d: number; // % window change
  moneyFlow10d: number;
  moneyFlow20d: number;
  accumulationScore: number; // 0-100
  technicalScore: number; // 0-100
  volumeScore: number; // 0-100
  relativeStrength: number; // % vs IHSG, 20 sessions
  anomalyRisk: number; // 0-100
  catalystScore: number; // 0-100 (50 = no events)
  overallScore: number; // 0-100
  signal: Signal;

  rsi: number; // RSI-14
  atr: number; // ATR-14 in IDR
  priceVs52w: number; // 0-100 position within the 52-week range
}

/** Stock-detail extras (zones, fundamentals, large-activity proxy). */
export interface StockDetail extends ScoredStock {
  sector?: string;
  industry?: string;
  description?: string;

  sma20?: number;
  sma50?: number;
  sma200?: number;
  obvTrend?: number; // OBV 20-session change, %

  support: number;
  resistance: number;
  entryLow: number;
  entryHigh: number;
  target: number;
  invalidation: number;
  riskReward: number;
  momentum: "STRONG" | "MODERATE" | "WEAK";
  distributionRisk: "LOW" | "MODERATE" | "HIGH";

  largeActivity: LargeActivityEvent[];
}

export type ActivityClass = "NORMAL" | "LARGE" | "ACCUMULATION-LIKE" | "DISTRIBUTION-LIKE" | "ANOMALOUS";

/** Abnormal-value-traded day detected from real OHLCV (Large Activity Proxy). */
export interface LargeActivityEvent {
  date: string; // yyyy-mm-dd
  value: number; // value traded, IDR
  changePercent: number; // close-to-close % that day
  volumeRatio: number; // vs 20d avg
  classification: ActivityClass;
  note: string;
}

/** Real corporate actions available from the free source (Yahoo events). */
export interface CorporateAction {
  id: string;
  ticker: string;
  companyName: string;
  date: string; // yyyy-mm-dd
  type: "Dividend" | "Stock Split";
  description: string;
  impact: "POSITIVE" | "NEUTRAL";
  amount?: number; // dividend per share
  score: number;
}

export interface MarketOverview {
  ihsgValue: number;
  ihsgChange: number;
  ihsgChangePercent: number;
  advancing: number; // within the tracked universe
  declining: number;
  unchanged: number;
  universeSize: number;
  totalVolume: number; // tracked universe sums
  totalValue: number;
  spark: number[]; // recent IHSG closes
  updatedAt: string; // ISO timestamp of the quote data
}

export interface Fundamentals {
  sector?: string;
  industry?: string;
  description?: string;
}

/** OHLCV bar — `time` is a unix timestamp in seconds. */
export interface PriceData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Why-this-stock explainability report (built from real computed values). */
export interface IntelligenceReport {
  signal: Signal;
  reasons: string[]; // positive evidence
  risks: string[]; // caution flags
}
