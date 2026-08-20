/**
 * MockMarketDataProvider — LOCAL DEVELOPMENT FIXTURES ONLY.
 *
 * These are hand-written fixtures covering the scoring scenarios listed in
 * Section 19 (strong accumulation, distribution, breakout, false breakout,
 * tier-A-like accumulation, fake volume, etc.) so the UI can be developed
 * and unit-tested without hitting live IDX/Yahoo endpoints.
 *
 * NEVER the default in production. Activated only via
 * `VITE_USE_MOCK_DATA=true` in local dev. When active, the app shows a
 * persistent "MOCK DATA" warning banner (see DataStatusNotice.tsx).
 */
import type {
  BrokerAccumulationSummary,
  CorporateAction,
  MarketOverview,
  PriceData,
  ScoredStock,
  StockDetail,
  SwingCandidate,
  TimeRange,
} from "../types";
import type { BrokerRadarEntry, MarketDataProvider } from "./marketData";

// ── fixture universe (10 stocks covering the Section 19 scenarios) ──────

interface FixtureDef {
  ticker: string;
  companyName: string;
  price: number;
  changePercent: number;
  marketCap: number; // IDR
  volume: number;
  avgVolume: number;
  moneyFlowScore: number;
  accumulationScore: number;
  technicalScore: number;
  catalystScore: number;
  anomalyRisk: number;
  overallScore: number;
  signal: ScoredStock["signal"];
  volumeRatio: number;
  brokerTier?: "A" | "B" | "C";
  brokerAccumulationScore?: number;
  volumeAuthenticityScore?: number;
}

const FIXTURES: FixtureDef[] = [
  {
    // strong accumulation + genuine volume — the textbook positive case
    ticker: "BBCA",
    companyName: "PT Bank Central Asia Tbk",
    price: 10250,
    changePercent: 1.8,
    marketCap: 1.26e15,
    volume: 65_000_000,
    avgVolume: 42_000_000,
    moneyFlowScore: 82,
    accumulationScore: 87,
    technicalScore: 76,
    catalystScore: 60,
    anomalyRisk: 18,
    overallScore: 84,
    signal: "STRONG BUY",
    volumeRatio: 1.6,
    brokerTier: "A",
    brokerAccumulationScore: 84,
    volumeAuthenticityScore: 79,
  },
  {
    ticker: "BBRI",
    companyName: "PT Bank Rakyat Indonesia Tbk",
    price: 5450,
    changePercent: 0.6,
    marketCap: 8.2e14,
    volume: 180_000_000,
    avgVolume: 150_000_000,
    moneyFlowScore: 68,
    accumulationScore: 72,
    technicalScore: 64,
    catalystScore: 74,
    anomalyRisk: 25,
    overallScore: 71,
    signal: "BUY",
    volumeRatio: 1.2,
    brokerTier: "B",
    brokerAccumulationScore: 66,
    volumeAuthenticityScore: 71,
  },
  {
    // strong distribution
    ticker: "TLKM",
    companyName: "PT Telkom Indonesia Tbk",
    price: 2980,
    changePercent: -2.4,
    marketCap: 2.95e14,
    volume: 95_000_000,
    avgVolume: 70_000_000,
    moneyFlowScore: 31,
    accumulationScore: 28,
    technicalScore: 34,
    catalystScore: 50,
    anomalyRisk: 42,
    overallScore: 33,
    signal: "REDUCE",
    volumeRatio: 1.4,
    brokerTier: "C",
    brokerAccumulationScore: 30,
    volumeAuthenticityScore: 48,
  },
  {
    // breakout, genuine
    ticker: "ADRO",
    companyName: "PT Alamtri Resources Indonesia Tbk",
    price: 3840,
    changePercent: 4.2,
    marketCap: 1.18e14,
    volume: 55_000_000,
    avgVolume: 25_000_000,
    moneyFlowScore: 79,
    accumulationScore: 81,
    technicalScore: 88,
    catalystScore: 55,
    anomalyRisk: 30,
    overallScore: 78,
    signal: "BUY",
    volumeRatio: 2.2,
    brokerTier: "A",
    brokerAccumulationScore: 78,
    volumeAuthenticityScore: 74,
  },
  {
    // false breakout: great technicals, wash-trading-like volume
    ticker: "GOTO",
    companyName: "PT GoTo Gojek Tokopedia Tbk",
    price: 92,
    changePercent: 6.8,
    marketCap: 1.1e14,
    volume: 2_400_000_000,
    avgVolume: 900_000_000,
    moneyFlowScore: 61,
    accumulationScore: 55,
    technicalScore: 74,
    catalystScore: 50,
    anomalyRisk: 78,
    overallScore: 52,
    signal: "WATCH",
    volumeRatio: 2.7,
    brokerTier: "C",
    brokerAccumulationScore: 34,
    volumeAuthenticityScore: 28,
  },
  {
    // high anomaly risk
    ticker: "PANI",
    companyName: "PT Pantai Indah Kapuk Dua Tbk",
    price: 12100,
    changePercent: -5.6,
    marketCap: 5.6e13,
    volume: 12_000_000,
    avgVolume: 4_000_000,
    moneyFlowScore: 22,
    accumulationScore: 26,
    technicalScore: 30,
    catalystScore: 50,
    anomalyRisk: 84,
    overallScore: 24,
    signal: "AVOID",
    volumeRatio: 3.0,
    brokerTier: "C",
    brokerAccumulationScore: 22,
    volumeAuthenticityScore: 31,
  },
  {
    ticker: "ASII",
    companyName: "PT Astra International Tbk",
    price: 5650,
    changePercent: -0.4,
    marketCap: 2.29e14,
    volume: 20_000_000,
    avgVolume: 22_000_000,
    moneyFlowScore: 48,
    accumulationScore: 44,
    technicalScore: 46,
    catalystScore: 55,
    anomalyRisk: 20,
    overallScore: 47,
    signal: "HOLD",
    volumeRatio: 0.9,
    brokerTier: "B",
    brokerAccumulationScore: 52,
    volumeAuthenticityScore: 62,
  },
  {
    ticker: "UNVR",
    companyName: "PT Unilever Indonesia Tbk",
    price: 1890,
    changePercent: 0.3,
    marketCap: 7.21e13,
    volume: 8_000_000,
    avgVolume: 10_000_000,
    moneyFlowScore: 52,
    accumulationScore: 58,
    technicalScore: 41,
    catalystScore: 68,
    anomalyRisk: 16,
    overallScore: 55,
    signal: "WATCH",
    volumeRatio: 0.8,
    brokerAccumulationScore: 55,
    volumeAuthenticityScore: 58,
  },
  {
    // tier-C suspicious accumulation (single-broker dominance)
    ticker: "EMTK",
    companyName: "PT Elang Mahkota Teknologi Tbk",
    price: 408,
    changePercent: 2.1,
    marketCap: 2.49e13,
    volume: 300_000_000,
    avgVolume: 210_000_000,
    moneyFlowScore: 58,
    accumulationScore: 61,
    technicalScore: 55,
    catalystScore: 50,
    anomalyRisk: 55,
    overallScore: 51,
    signal: "WATCH",
    volumeRatio: 1.4,
    brokerTier: "C",
    brokerAccumulationScore: 41,
    volumeAuthenticityScore: 44,
  },
  {
    ticker: "SIDO",
    companyName: "PT Industri Jamu dan Farmasi Sido Muncul Tbk",
    price: 685,
    changePercent: 1.2,
    marketCap: 2.06e13,
    volume: 35_000_000,
    avgVolume: 28_000_000,
    moneyFlowScore: 64,
    accumulationScore: 66,
    technicalScore: 58,
    catalystScore: 50,
    anomalyRisk: 24,
    overallScore: 61,
    signal: "WATCH",
    volumeRatio: 1.25,
    brokerTier: "B",
    brokerAccumulationScore: 60,
    volumeAuthenticityScore: 65,
  },
];

const UPDATED_AT = "2026-08-20T09:00:00.000Z";

function toScoredStock(f: FixtureDef): ScoredStock {
  return {
    symbol: `${f.ticker}.JK`,
    ticker: f.ticker,
    companyName: f.companyName,
    price: f.price,
    changePercent: f.changePercent,
    prevClose: Math.round((f.price / (1 + f.changePercent / 100)) * 100) / 100,
    volume: f.volume,
    avgVolume: f.avgVolume,
    volumeRatio: f.volumeRatio,
    marketCap: f.marketCap,
    high52: f.price * 1.15,
    low52: f.price * 0.75,
    moneyFlowScore: f.moneyFlowScore,
    moneyFlow5d: 4.2,
    moneyFlow10d: 9.1,
    moneyFlow20d: 15.6,
    accumulationScore: f.accumulationScore,
    technicalScore: f.technicalScore,
    volumeScore: 62,
    relativeStrength: f.changePercent * 1.2,
    anomalyRisk: f.anomalyRisk,
    catalystScore: f.catalystScore,
    overallScore: f.overallScore,
    signal: f.signal,
    rsi: f.technicalScore > 70 ? 66 : 52,
    atr: f.price * 0.02,
    priceVs52w: 62,
    brokerAccumulationScore: f.brokerAccumulationScore,
    brokerTier: f.brokerTier,
    volumeAuthenticityScore: f.volumeAuthenticityScore,
  };
}

function toDetail(f: FixtureDef): StockDetail {
  const s = toScoredStock(f);
  const genuine = (f.volumeAuthenticityScore ?? 60) >= 60;
  return {
    ...s,
    sector: "Consumer Cyclical",
    sma20: f.price * 0.97,
    sma50: f.price * 0.94,
    sma200: f.price * 0.88,
    obvTrend: 12,
    support: f.price * 0.96,
    resistance: f.price * 1.06,
    entryLow: f.price * 0.97,
    entryHigh: f.price * 0.99,
    target: f.price * 1.08,
    invalidation: f.price * 0.94,
    riskReward: 2.1,
    momentum: f.moneyFlowScore > 60 ? "STRONG" : "MODERATE",
    distributionRisk: f.moneyFlowScore > 60 ? "LOW" : "MODERATE",
    largeActivity: [],
    volumeAuthenticity: {
      ticker: f.ticker,
      score: f.volumeAuthenticityScore ?? 60,
      classification: genuine ? "GENUINE" : "SUSPICIOUS",
      frequencyToVolumeRatio: null,
      priceHeldAfterSpike: genuine,
      spreadStability: null,
      correlatesWithBrokerAccumulation: (f.brokerTier ?? "C") !== "C",
      redFlags: genuine ? [] : ["FIXTURE — volume spike with flat close"],
    },
  };
}

/** Deterministic pseudo-bars for chart ranges (fixture, not live data). */
function fixtureBars(ticker: string, range: TimeRange, price: number): PriceData[] {
  const points: Record<TimeRange, number> = { "1D": 78, "1W": 7 * 7, "1M": 22, "3M": 66, "6M": 130, "1Y": 260 };
  const stepSec: Record<TimeRange, number> = { "1D": 300, "1W": 900, "1M": 3600, "3M": 86400, "6M": 86400, "1Y": 86400 };
  const n = points[range];
  const seed = ticker.length * 31 + n;
  const bars: PriceData[] = [];
  const end = Math.floor(Date.now() / 1000);
  for (let i = 0; i < n; i++) {
    const t = end - (n - i) * stepSec[range];
    const wave = Math.sin(i / 9 + seed) * 0.008;
    const drift = (i / n - 0.5) * 0.06;
    const c = price * (1 + wave + drift);
    const o = c * (1 + Math.sin(i / 5 + seed) * 0.004);
    bars.push({
      time: t,
      open: Math.round(o),
      high: Math.round(Math.max(o, c) * 1.004),
      low: Math.round(Math.min(o, c) * 0.996),
      close: Math.round(c),
      volume: 20_000_000 + Math.abs(Math.sin(i / 3 + seed)) * 25_000_000,
    });
  }
  return bars;
}

const FIXTURE_ACTIONS: CorporateAction[] = [
  {
    id: "fx-bbri-div",
    ticker: "BBRI",
    companyName: "PT Bank Rakyat Indonesia Tbk",
    date: "2026-08-10",
    type: "Dividend",
    description: "Dividend of Rp 112 per share (2.1% yield at current price)",
    impact: "POSITIVE",
    amount: 112,
    score: 72,
  },
  {
    id: "fx-bbca-div",
    ticker: "BBCA",
    companyName: "PT Bank Central Asia Tbk",
    date: "2026-07-22",
    type: "Dividend",
    description: "Dividend of Rp 145 per share (1.4% yield at current price)",
    impact: "POSITIVE",
    amount: 145,
    score: 68,
  },
  {
    id: "fx-adro-split",
    ticker: "ADRO",
    companyName: "PT Alamtri Resources Indonesia Tbk",
    date: "2026-06-30",
    type: "Stock Split",
    description: "Stock split",
    impact: "NEUTRAL",
    score: 55,
  },
];

// ── broker fixtures (dev only — two representative cases) ────────────────

function brokerFixture(
  ticker: string,
  tier: "A" | "B" | "C",
  score: number,
  topBuyers: string[],
  reason: string,
): BrokerAccumulationSummary {
  const mk = (code: string, netB: number, type: BrokerAccumulationSummary["windows"][number]["topNetBuyers"][number]["brokerType"]) => ({
    brokerCode: code,
    brokerName: code,
    brokerType: type,
    netVolume: Math.round(netB * 10),
    netValue: netB * 1e9,
    buyVolume: Math.round(netB * 14),
    sellVolume: Math.round(netB * 4),
    ownershipPercent: 0.1,
  });
  const ranges = ["7D", "14D", "30D"] as const;
  return {
    ticker,
    windows: ranges.map((range, i) => ({
      range,
      topNetBuyers: topBuyers.map((c, j) => mk(c, 40 - i * 8 - j * 5, i % 2 === 0 ? "FOREIGN" : "DOMESTIC")),
      topNetSellers: [mk("CC", -20, "DOMESTIC")],
      totalValue: 5000e9 - i * 1000e9,
      foreignNetValue: 120e9 - i * 30e9,
    })),
    consistentAcrossWindows: tier === "A",
    dominantParty: "MIXED",
    concentrationRisk: tier === "C" ? 68 : 34,
    tier,
    tierReason: `FIXTURE — ${reason}`,
    score,
    updatedAt: UPDATED_AT,
    source: "LIVE",
  };
}

export class MockMarketDataProvider implements MarketDataProvider {
  readonly kind = "mock";

  async getMarketOverview(): Promise<MarketOverview> {
    const stocks = FIXTURES.map(toScoredStock);
    const advancing = stocks.filter((s) => s.changePercent > 0.05).length;
    const declining = stocks.filter((s) => s.changePercent < -0.05).length;
    return {
      ihsgValue: 7421.38,
      ihsgChange: 34.12,
      ihsgChangePercent: 0.46,
      advancing,
      declining,
      unchanged: stocks.length - advancing - declining,
      universeSize: stocks.length,
      totalVolume: stocks.reduce((x, s) => x + s.volume, 0),
      totalValue: stocks.reduce((x, s) => x + s.volume * s.price, 0),
      spark: [7350, 7380, 7360, 7401, 7415, 7399, 7421],
      updatedAt: UPDATED_AT,
    };
  }

  async getUniverse(): Promise<{ stocks: ScoredStock[]; updatedAt: string }> {
    return { stocks: FIXTURES.map(toScoredStock), updatedAt: UPDATED_AT };
  }

  async getStockDetail(ticker: string): Promise<{
    stock: StockDetail;
    actions: CorporateAction[];
    updatedAt: string;
  }> {
    const f = FIXTURES.find((x) => x.ticker === ticker.toUpperCase());
    if (!f) {
      // not in fixtures: pretend the API's 404 path
      return { stock: null as unknown as StockDetail, actions: [], updatedAt: UPDATED_AT };
    }
    const actions = FIXTURE_ACTIONS.filter((a) => a.ticker === f.ticker);
    return { stock: toDetail(f), actions, updatedAt: UPDATED_AT };
  }

  async getHistoricalPrices(ticker: string, range: TimeRange): Promise<PriceData[]> {
    const f = FIXTURES.find((x) => x.ticker === ticker.toUpperCase());
    const price = f?.price ?? 1000;
    return fixtureBars(ticker.toUpperCase(), range, price);
  }

  async getEvents(): Promise<{ actions: CorporateAction[]; updatedAt: string }> {
    return { actions: FIXTURE_ACTIONS, updatedAt: UPDATED_AT };
  }

  async getBrokerSummary(ticker: string): Promise<BrokerAccumulationSummary | null> {
    const t = ticker.toUpperCase();
    if (t === "BBCA") {
      return brokerFixture("BBCA", "A", 84, ["ZP", "BK", "RX"], "consistent net buying 7/14/30D");
    }
    if (t === "ADRO") {
      return brokerFixture("ADRO", "B", 66, ["YU", "NI"], "14/30D visible, 7D mixed");
    }
    return null; // → UI shows "Broker data unavailable"
  }

  async getBrokerRadar(): Promise<{ entries: BrokerRadarEntry[]; updatedAt: string }> {
    const entries: BrokerRadarEntry[] = FIXTURES.map((f) => {
      if (f.ticker === "BBCA" || f.ticker === "ADRO") {
        return { ticker: f.ticker, summary: brokerFixture(f.ticker, "A", 84, ["ZP", "BK"], "fixture"), status: "FRESH" as const };
      }
      return { ticker: f.ticker, summary: null, status: "PENDING" as const };
    });
    return { entries, updatedAt: UPDATED_AT };
  }

  async getSwingCandidates(): Promise<{ candidates: SwingCandidate[]; updatedAt: string }> {
    const mk = (ticker: string, score: number, setup: SwingCandidate["technicalSetup"], conf: SwingCandidate["confidence"]): SwingCandidate => ({
      ticker,
      companyName: FIXTURES.find((f) => f.ticker === ticker)?.companyName ?? ticker,
      overallScore: score,
      confidence: conf,
      brokerTier: "A",
      brokerReason: "FIXTURE — consistent net buying across 7/14/30D",
      volumeAuthenticityScore: 79,
      volumeClassification: "GENUINE",
      technicalSetup: setup,
      entry: 10200,
      stopLoss: 9850,
      takeProfit1: 10900,
      takeProfit2: 11300,
      fundamentalNote: "FIXTURE — EPS trend improving; PBV 2.4; ROE 21.8%. No red flags from available data.",
      holdingHorizonDays: [10, 20],
      category: "SWING",
      riskNotes: [],
      updatedAt: UPDATED_AT,
    });
    return {
      candidates: [
        mk("BBCA", 84, "BREAKOUT", "HIGH"),
        mk("ADRO", 72, "PULLBACK", "MEDIUM"),
      ],
      updatedAt: UPDATED_AT,
    };
  }
}
