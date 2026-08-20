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

  // Bandarmology / volume authenticity (Section 13a/13b) — computed from the
  // broker source and OHLCV respectively; undefined when data is unavailable
  // for this ticker (UI shows an explicit unavailable state, never a fake 0).
  brokerAccumulationScore?: number; // 0-100
  brokerTier?: "A" | "B" | "C";
  volumeAuthenticityScore?: number; // 0-100
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

  /** Full Section 13b assessment (with red flags) — undefined when unavailable. */
  volumeAuthenticity?: VolumeAuthenticity;
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

/** Canonical corporate-action taxonomy (Section 14). Open-ended by design —
 *  new types can be added without breaking consumers; this list only drives
 *  filter chips, icons, and the server-side keyword classifier. */
export const CORPORATE_ACTION_TYPES = [
  "Dividend",
  "RUPS",
  "Buyback",
  "Acquisition",
  "Merger",
  "Right Issue",
  "Tender Offer",
  "Stock Split",
  "Private Placement",
  "Expansion",
  "New Contract",
  "Strategic Partnership",
  "Ownership Change",
] as const;

/** Real corporate actions from the live sources (Yahoo events + news feeds). */
export interface CorporateAction {
  id: string;
  ticker: string;
  companyName: string;
  date: string; // yyyy-mm-dd
  type: string; // open string — see CORPORATE_ACTION_TYPES for the current taxonomy
  description: string;
  impact: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  amount?: number; // dividend per share
  score: number;
  source: string; // e.g. "CNBC Indonesia", "IDX Channel", "Yahoo Finance"
  sourceUrl?: string;
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
  // Section 13c sanity layer (added with the swing-candidate feature):
  // undefined = not available from the free source for this ticker.
  epsTrend?: "IMPROVING" | "FLAT" | "DECLINING";
  pbv?: number;
  roa?: number;
  roe?: number;
  der?: number;
  redFlags?: string[];
  sectorInFavor?: boolean;
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

// ── Broker Accumulation / Bandarmology (Section 13a) ─────────────────────

export type BrokerWindowRange = "7D" | "14D" | "30D";
export type BrokerParty = "FOREIGN" | "DOMESTIC_INSTITUTION" | "UNIDENTIFIED" | "MIXED";
export type BrokerTier = "A" | "B" | "C";

/** Net buy/sell activity of one broker over one window. */
export interface BrokerNetActivity {
  brokerCode: string;
  brokerName: string; // resolved from the static reference map; falls back to the code
  brokerType: "FOREIGN" | "DOMESTIC" | "RETAIL" | "UNKNOWN";
  netVolume: number; // net lots (1 lot = 100 shares)
  netValue: number; // net buy value in IDR (negative = net selling)
  buyVolume: number;
  sellVolume: number;
  ownershipPercent: number; // estimated |net value| / market cap × 100 (proxy, clearly labeled in UI)
}

export interface BrokerWindow {
  range: BrokerWindowRange;
  topNetBuyers: BrokerNetActivity[];
  topNetSellers: BrokerNetActivity[];
  totalValue: number; // total traded value in the window, IDR
  foreignNetValue: number; // foreign net buy value, IDR
}

export interface BrokerAccumulationSummary {
  ticker: string;
  windows: BrokerWindow[];
  consistentAcrossWindows: boolean;
  dominantParty: BrokerParty;
  concentrationRisk: number; // % of 7D net buying held by the single largest broker
  tier: BrokerTier;
  tierReason: string;
  score: number; // 0-100
  updatedAt: string; // ISO timestamp when the summary was computed
  source: "LIVE" | "UNAVAILABLE";
}

// ── Volume Authenticity (Section 13b) ────────────────────────────────────

export interface VolumeAuthenticity {
  ticker: string;
  score: number; // 0-100
  classification: "GENUINE" | "SUSPICIOUS";
  frequencyToVolumeRatio: number | null; // null = not available from the free daily-bar source
  priceHeldAfterSpike: boolean;
  spreadStability: number | null; // 0-100; null = not available
  // null = broker data unavailable, correlation not assessed (honest "n/a")
  correlatesWithBrokerAccumulation: boolean | null;
  redFlags: string[];
}

// ── Swing Candidates (Section 13c) ───────────────────────────────────────

export type SwingConfidence = "HIGH" | "MEDIUM" | "LOW";
export type SwingSetup = "BREAKOUT" | "PULLBACK" | "RANGE";
export type SwingCategory = "SCALPING" | "INTRADAY" | "SWING" | "INVESTMENT";

export interface SwingCandidate {
  ticker: string;
  companyName: string;
  overallScore: number;
  confidence: SwingConfidence;
  brokerTier: "A" | "B" | "C";
  brokerReason: string;
  volumeAuthenticityScore: number;
  volumeClassification: "GENUINE" | "SUSPICIOUS";
  technicalSetup: SwingSetup;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  fundamentalNote: string;
  holdingHorizonDays: [number, number];
  category: SwingCategory;
  riskNotes: string[];
  updatedAt: string;
}

// ── Fundamentals (Section 13c sanity layer) ──────────────────────────────
// Extends the Fundamentals interface above; all fields optional because the
// free source may not have coverage for every ticker.
