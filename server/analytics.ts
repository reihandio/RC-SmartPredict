/**
 * Analytics engine — every score is derived from REAL OHLCV data.
 * Nothing here is random or hardcoded; each output has a documented formula.
 *
 * Wording rules: "Money Flow Proxy" (not institutional flow), "Accumulation-like",
 * "unusual trading pattern" (never manipulation claims).
 */
import type {
  ActivityClass,
  CorporateAction,
  LargeActivityEvent,
  RiskLevel,
  ScoredStock,
  Signal,
  StockDetail,
} from "../src/types/index.js";
import type { YahooBar, YahooChart, YahooEvent, YahooQuote } from "./yahoo.js";
import { volumeAuthenticity } from "./volumeAuthenticity.js";

export const clamp = (v: number, min = 0, max = 100): number => Math.min(max, Math.max(min, v));
export const round1 = (v: number): number => Math.round(v * 10) / 10;

// ── indicator math ──────────────────────────────────────────────────────

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  let sum = 0;
  for (let i = values.length - period; i < values.length; i++) sum += values[i];
  return sum / period;
}

export function ema(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let seed = 0;
  const start = values.length - period;
  for (let i = start; i < values.length; i++) seed += values[i];
  let prev = seed / period;
  for (let i = start + period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
  }
  return prev;
}

export function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  if (loss === 0) return 100;
  const rs = gain / period / (loss / period);
  return 100 - 100 / (1 + rs);
}

export function atr(bars: YahooBar[], period = 14): number | null {
  if (bars.length < period + 1) return null;
  let sum = 0;
  for (let i = bars.length - period; i < bars.length; i++) {
    const b = bars[i];
    const prev = bars[i - 1];
    sum += Math.max(b.high - b.low, Math.abs(b.high - prev.close), Math.abs(b.low - prev.close));
  }
  return sum / period;
}

export function macdHistogram(closes: number[]): number | null {
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  if (ema12 === null || ema26 === null) return null;
  const macdLine = ema12 - ema26;
  // signal: EMA-9 of macd line over the last 9 values
  const macdSeries: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    const e12 = ema(closes.slice(0, i + 1), 12);
    const e26 = ema(closes.slice(0, i + 1), 26);
    if (e12 !== null && e26 !== null) macdSeries.push(e12 - e26);
  }
  const signal = ema(macdSeries, 9);
  if (signal === null) return null;
  return macdLine - signal;
}

export function obv(bars: YahooBar[]): number[] {
  const out: number[] = [];
  let v = 0;
  for (let i = 0; i < bars.length; i++) {
    if (i === 0) {
      out.push(0);
      continue;
    }
    if (bars[i].close > bars[i - 1].close) v += bars[i].volume;
    else if (bars[i].close < bars[i - 1].close) v -= bars[i].volume;
    out.push(v);
  }
  return out;
}

/** % return over the last `n` sessions. */
export function pctReturn(closes: number[], n: number): number | null {
  if (closes.length < n + 1) return null;
  const from = closes[closes.length - 1 - n];
  if (!from) return null;
  return ((closes[closes.length - 1] - from) / from) * 100;
}

// ── Money Flow Proxy ────────────────────────────────────────────────────

interface FlowWindows {
  score: number; // 0-100
  flow5d: number; // %
  flow10d: number;
  flow20d: number;
}

/**
 * Money Flow Proxy — derived from real price × volume.
 * dailyFlow = (close − prevClose) × volume  (≈ IDR value traded, signed)
 * A window score = positive-flow share of total |flow|, mapped 0-100.
 */
export function moneyFlowProxy(bars: YahooBar[]): FlowWindows {
  const flows: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    flows.push((bars[i].close - bars[i - 1].close) * bars[i].volume);
  }

  const windowShare = (n: number): number | null => {
    if (flows.length < n) return null;
    let pos = 0;
    let abs = 0;
    for (let i = flows.length - n; i < flows.length; i++) {
      pos += Math.max(flows[i], 0);
      abs += Math.abs(flows[i]);
    }
    if (abs === 0) return null;
    return pos / abs;
  };

  const s5 = windowShare(5);
  const s10 = windowShare(10);
  const s20 = windowShare(20);

  const score = clamp(
    Math.round(
      (s20 ?? 0.5) * 50 + (s10 ?? 0.5) * 30 + (s5 ?? 0.5) * 20,
    ),
  );

  const windowFlow = (n: number): number | null => {
    if (flows.length < n) return null;
    let sum = 0;
    for (let i = flows.length - n; i < flows.length; i++) sum += flows[i];
    return sum;
  };

  const pctChange = (n: number): number => {
    const cur = windowFlow(n);
    if (cur === null) return 0;
    const prevStart = flows.length - 2 * n;
    if (prevStart < 0) return 0;
    let prevSum = 0;
    let prevAbs = 0;
    for (let i = prevStart; i < flows.length - n; i++) {
      prevSum += flows[i];
      prevAbs += Math.abs(flows[i]);
    }
    if (prevAbs === 0) return 0;
    return round1((cur / prevAbs) * 100);
  };

  return { score, flow5d: pctChange(5), flow10d: pctChange(10), flow20d: pctChange(20) };
}

/** Volume ratio: latest volume vs 20-session average. */
export function volumeRatio(bars: YahooBar[]): number {
  if (bars.length < 21) return 1;
  const last = bars[bars.length - 1].volume;
  let sum = 0;
  for (let i = bars.length - 21; i < bars.length - 1; i++) sum += bars[i].volume;
  const avg = sum / 20;
  return avg > 0 ? round1(last / avg) : 1;
}

/** Volume/activity score (0-100): above-average participation, not extreme. */
export function volumeScore(ratio: number, flow20d: number): number {
  const base = clamp(50 + (ratio - 1) * 18, 0, 100);
  const trend = clamp(flow20d * 0.8, -25, 25);
  return Math.round(clamp(base + trend));
}

/** Accumulation-like detection from real up/down volume split + flow proxy. */
export function accumulationScore(bars: YahooBar[], flowScore: number): number {
  let upVol = 0;
  let downVol = 0;
  let n = 0;
  for (let i = bars.length - 20; i < bars.length; i++) {
    if (i <= 0) continue;
    n++;
    if (bars[i].close >= bars[i - 1].close) upVol += bars[i].volume;
    else downVol += bars[i].volume;
  }
  const upShare = n > 0 && upVol + downVol > 0 ? upVol / (upVol + downVol) : 0.5;
  const closes = bars.map((b) => b.close);
  const s20 = sma(closes, 20);
  const aboveSma = s20 !== null && closes[closes.length - 1] > s20 ? 1 : 0;
  const score = Math.round(clamp(upShare * 55 + flowScore * 0.3 + aboveSma * 15));
  return score;
}

/** Technical score from real indicators: SMA ladder, RSI zone, MACD. */
export function technicalScore(bars: YahooBar[]): number {
  const closes = bars.map((b) => b.close);
  const price = closes[closes.length - 1];
  let score = 0;
  const s20 = sma(closes, 20);
  const s50 = sma(closes, 50);
  const s200 = sma(closes, 200);
  if (s20 !== null && price > s20) score += 20;
  if (s50 !== null && price > s50) score += 20;
  if (s200 !== null && price > s200) score += 20;
  const r = rsi(closes);
  if (r !== null) {
    if (r >= 50 && r <= 68) score += 20;
    else if (r >= 40 && r < 50) score += 12;
    else if (r > 68 && r <= 78) score += 6;
  }
  const mh = macdHistogram(closes);
  if (mh !== null && mh > 0) score += 20;
  return clamp(score);
}

/**
 * Anomaly Risk (0-100) from real OHLCV features:
 * volume spike, price spike, intraday reversal, price/volume divergence,
 * volatility expansion, low liquidity — plus (Section 13b) the Volume
 * Authenticity score: low authenticity pushes risk up. When the
 * authenticity score is unavailable the historical factors still apply
 * unchanged (the extra term is simply skipped).
 */
export function anomalyRisk(
  bars: YahooBar[],
  vr: number,
  avgValue20d: number,
  volumeAuthenticityScore?: number,
): number {
  let risk = 0;
  const last = bars[bars.length - 1];
  const prev = bars[bars.length - 2];
  if (!last || !prev) return 0;

  const changePct = prev.close ? ((last.close - prev.close) / prev.close) * 100 : 0;
  const o = last.open;
  const c = last.close;
  const intradayUp = c >= o;

  if (vr >= 3) risk += 30;
  else if (vr >= 2) risk += 18;
  else if (vr >= 1.5) risk += 8;

  if (Math.abs(changePct) >= 7) risk += 25;
  else if (Math.abs(changePct) >= 5) risk += 15;
  else if (Math.abs(changePct) >= 3.5) risk += 8;

  // reversal: closed against the direction of the gap
  if (changePct >= 3 && !intradayUp) risk += 15;
  else if (changePct <= -3 && intradayUp) risk += 15;

  // price moved sharply on thin volume, or fell hard on a volume spike
  if (Math.abs(changePct) >= 3 && vr < 0.8) risk += 10;
  if (changePct <= -3 && vr >= 2) risk += 10;

  // volatility expansion: ATR vs its own recent mean
  const a = atr(bars, 14);
  if (a !== null) {
    const aPrev = atr(bars.slice(0, -10), 14);
    if (aPrev !== null && aPrev > 0 && a / aPrev > 2) risk += 12;
  }

  // low liquidity
  if (avgValue20d > 0 && avgValue20d < 2e9) risk += 10;

  // Section 13b factor: low volume authenticity → elevated anomaly risk
  if (volumeAuthenticityScore !== undefined) {
    risk += Math.max(0, 100 - volumeAuthenticityScore) * 0.25;
  }

  return Math.round(clamp(risk, 0, 100));
}

export function riskLevel(r: number): RiskLevel {
  if (r <= 20) return "LOW";
  if (r <= 40) return "MODERATE";
  if (r <= 60) return "ELEVATED";
  return "HIGH";
}

/**
 * Large Activity Proxy — abnormal value-traded days from real OHLCV.
 * NOT transaction-level data (that is not available from the free source).
 */
export function largeActivity(bars: YahooBar[]): LargeActivityEvent[] {
  if (bars.length < 25) return [];
  const values = bars.map((b) => b.close * b.volume);
  let avg = 0;
  let avgVol = 0;
  for (let i = bars.length - 21; i < bars.length - 1; i++) {
    avg += values[i] / 20;
    avgVol += bars[i].volume / 20;
  }

  const events: LargeActivityEvent[] = [];
  for (let i = bars.length - 21; i < bars.length; i++) {
    const b = bars[i];
    const v = b.close * b.volume;
    if (avg <= 0 || v < avg * 2) continue;
    const prev = bars[i - 1];
    const next = bars[i + 1];
    const changePct = prev.close ? ((b.close - prev.close) / prev.close) * 100 : 0;
    const vr = avgVol > 0 ? b.volume / avgVol : 1;
    const reversal = next && prev.close ? (next.close - b.close) / b.close : 0;

    let classification: ActivityClass = "LARGE";
    let note = "Abnormal value traded — no clear follow-through";
    if (changePct >= 1.5 && reversal > 0) {
      classification = "ACCUMULATION-LIKE";
      note = "Large value + positive close with follow-through";
    } else if (changePct <= -1.5) {
      classification = "DISTRIBUTION-LIKE";
      note = "Large value with negative price response";
    } else if (Math.abs(changePct) >= 5 && Math.sign(reversal) === -Math.sign(changePct)) {
      classification = "ANOMALOUS";
      note = "Sharp spike with immediate reversal";
    }
    events.push({
      date: new Date(b.time * 1000).toISOString().slice(0, 10),
      value: v,
      changePercent: round1(changePct),
      volumeRatio: round1(vr),
      classification,
      note,
    });
  }
  return events.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
}

/** Catalyst score from REAL corporate events (dividends / splits). */
export function catalystScore(events: YahooEvent[], price: number): number {
  const today = Date.now();
  const daysAgo = (date: string): number => (today - new Date(`${date}T00:00:00Z`).getTime()) / 86400e3;
  let best: number | null = null;
  for (const e of events) {
    const d = daysAgo(e.date);
    if (e.type === "Dividend") {
      const yieldPct = e.amount && price > 0 ? (e.amount / price) * 100 : 0;
      const s = d <= 60 ? 70 + Math.min(20, yieldPct * 2) : d <= 120 ? 62 : 55;
      if (best === null || s > best) best = s;
    } else if (e.type === "Stock Split") {
      const s = d <= 90 ? 58 : 52;
      if (best === null || s > best) best = s;
    }
  }
  // 50 = neutral: no recent events in the available free data
  return Math.round(best ?? 50);
}

// ── signals ─────────────────────────────────────────────────────────────

const SIGNAL_THRESHOLDS: ReadonlyArray<{ min: number; signal: Signal }> = [
  { min: 80, signal: "STRONG BUY" },
  { min: 70, signal: "BUY" },
  { min: 55, signal: "WATCH" },
  { min: 40, signal: "HOLD" },
  { min: 30, signal: "REDUCE" },
  { min: 0, signal: "SELL" },
];

export function getSignal(overallScore: number, anomaly: number): Signal {
  if (anomaly >= 80) return "AVOID";
  for (const t of SIGNAL_THRESHOLDS) {
    if (overallScore >= t.min) return t.signal;
  }
  return "SELL";
}

/** Overall score weights (spec): flow 30 / technical 25 / RS 15 / volume 15 / catalyst 10 / risk 5. */
export const SCORE_WEIGHTS = {
  moneyFlow: 0.3,
  technical: 0.25,
  relativeStrength: 0.15,
  volume: 0.15,
  catalyst: 0.1,
  risk: 0.05,
} as const;

export function overallScore(s: {
  moneyFlowScore: number;
  technicalScore: number;
  relativeStrength: number; // %
  volumeScore: number;
  catalystScore: number;
  anomalyRisk: number;
}): number {
  const rsScore = clamp(50 + s.relativeStrength * 6); // 0 → 50, +8.3% → 100
  const raw =
    s.moneyFlowScore * SCORE_WEIGHTS.moneyFlow +
    s.technicalScore * SCORE_WEIGHTS.technical +
    rsScore * SCORE_WEIGHTS.relativeStrength +
    s.volumeScore * SCORE_WEIGHTS.volume +
    s.catalystScore * SCORE_WEIGHTS.catalyst +
    (100 - s.anomalyRisk) * SCORE_WEIGHTS.risk;
  return Math.round(clamp(raw));
}

/** Score one stock from quote + daily history + IHSG 20d return. */
export function scoreStock(
  quote: YahooQuote,
  chart: YahooChart,
  ihsg20dReturn: number | null,
  /** Cached Bandarmology context (Section 13a) for the VA cross-reference; null = unknown. */
  broker?: { score: number; tier: string } | null,
): ScoredStock {
  const bars = chart.bars;
  const closes = bars.map((b) => b.close);
  const flow = moneyFlowProxy(bars);
  const vr = volumeRatio(bars);
  const stock20d = pctReturn(closes, 20);
  const relativeStrength =
    stock20d !== null && ihsg20dReturn !== null ? round1(stock20d - ihsg20dReturn) : 0;

  const a = atr(bars, 14);
  const values20 = bars.slice(-20).map((b) => b.close * b.volume);
  const avgValue20d = values20.length
    ? values20.reduce((x, y) => x + y, 0) / values20.length
    : 0;

  // Volume authenticity (Section 13b) — same real bars; broker cross-reference
  // included when the cached Bandarmology summary is available.
  const va = volumeAuthenticity(bars, {
    brokerAccumulationScore: broker?.score ?? null,
    brokerTier: broker?.tier ?? null,
    marketCap: quote.marketCap,
  });
  const anomaly = anomalyRisk(bars, vr, avgValue20d, va.score);
  const catalyst = catalystScore(chart.events, quote.price);
  const volScore = volumeScore(vr, flow.flow20d);
  const technical = technicalScore(bars);
  const accumulation = accumulationScore(bars, flow.score);

  const score = overallScore({
    moneyFlowScore: flow.score,
    technicalScore: technical,
    relativeStrength,
    volumeScore: volScore,
    catalystScore: catalyst,
    anomalyRisk: anomaly,
  });

  const r = rsi(closes) ?? 50;
  const priceVs52w =
    quote.high52 > quote.low52
      ? Math.round(clamp(((quote.price - quote.low52) / (quote.high52 - quote.low52)) * 100))
      : 50;

  return {
    symbol: quote.symbol,
    ticker: quote.symbol.replace(/\.JK$/i, ""),
    companyName: quote.name,
    price: round1(quote.price),
    changePercent: round1(quote.changePercent),
    prevClose: round1(quote.prevClose),
    volume: quote.volume,
    avgVolume: quote.avgVolume,
    volumeRatio: vr,
    marketCap: quote.marketCap,
    high52: round1(quote.high52),
    low52: round1(quote.low52),
    moneyFlowScore: flow.score,
    moneyFlow5d: flow.flow5d,
    moneyFlow10d: flow.flow10d,
    moneyFlow20d: flow.flow20d,
    accumulationScore: accumulation,
    technicalScore: technical,
    volumeScore: volScore,
    relativeStrength,
    anomalyRisk: anomaly,
    catalystScore: catalyst,
    overallScore: score,
    signal: getSignal(score, anomaly),
    rsi: Math.round(r),
    atr: a !== null ? round1(a) : 0,
    priceVs52w,
    volumeAuthenticityScore: va.score,
  };
}

/** Extend a scored stock with detail-page extras (zones, fundamentals, events). */
export function buildStockDetail(
  stock: ScoredStock,
  chart: YahooChart,
  fundamentals: { sector?: string; industry?: string; description?: string } | null,
): StockDetail {
  const bars = chart.bars;
  const closes = bars.map((b) => b.close);
  const last20 = bars.slice(-20);
  const support = last20.length ? Math.min(...last20.map((b) => b.low)) : stock.prevClose * 0.97;
  const resistance = last20.length ? Math.max(...last20.map((b) => b.high)) : stock.prevClose * 1.05;
  const a = stock.atr > 0 ? stock.atr : stock.price * 0.02;

  const entryLow = round1(support);
  const entryHigh = round1(Math.min(support + a, stock.price));
  const target = round1(Math.max(resistance, stock.price + 2 * a));
  const invalidation = round1(support - 0.5 * a);
  const riskDist = Math.max((entryLow + entryHigh) / 2 - invalidation, stock.price * 0.005);
  const rewardDist = Math.max(target - (entryLow + entryHigh) / 2, stock.price * 0.005);
  const riskReward = round1(rewardDist / riskDist);

  const accel = stock.moneyFlow5d - stock.moneyFlow20d;
  const momentum: StockDetail["momentum"] = accel >= 10 ? "STRONG" : accel > 0 ? "MODERATE" : "WEAK";
  const distributionRisk: StockDetail["distributionRisk"] =
    stock.moneyFlow10d <= -10 ? "HIGH" : stock.moneyFlow10d < 0 ? "MODERATE" : "LOW";

  const obvSeries = obv(bars);
  const obvTrend =
    obvSeries.length > 21 && Math.abs(obvSeries[obvSeries.length - 21]) > 1
      ? round1(((obvSeries[obvSeries.length - 1] - obvSeries[obvSeries.length - 21]) /
          Math.abs(obvSeries[obvSeries.length - 21])) * 100)
      : 0;

  return {
    ...stock,
    sector: fundamentals?.sector,
    industry: fundamentals?.industry,
    description: fundamentals?.description,
    sma20: sma(closes, 20) ?? undefined,
    sma50: sma(closes, 50) ?? undefined,
    sma200: sma(closes, 200) ?? undefined,
    obvTrend,
    support: round1(support),
    resistance: round1(resistance),
    entryLow,
    entryHigh,
    target,
    invalidation,
    riskReward,
    momentum,
    distributionRisk,
    largeActivity: largeActivity(bars),
  };
}

/** Normalize real Yahoo events into CorporateAction rows for the radar. */
export function corporateActionsFromEvents(
  events: YahooEvent[],
  quote: YahooQuote,
): CorporateAction[] {
  return events
    .filter((e) => {
      const daysAgo = (Date.now() - new Date(`${e.date}T00:00:00Z`).getTime()) / 86400e3;
      return daysAgo <= 400 && daysAgo >= -7;
    })
    .map((e, i) => {
      const isDividend = e.type === "Dividend";
      const yieldPct = isDividend && e.amount && quote.price > 0
        ? round1((e.amount / quote.price) * 100)
        : 0;
      return {
        id: `${quote.symbol}-${e.date}-${i}`,
        ticker: quote.symbol.replace(/\.JK$/i, ""),
        companyName: quote.name,
        date: e.date,
        type: e.type,
        description: isDividend
          ? `Dividend of Rp ${e.amount} per share (${yieldPct}% yield at current price)`
          : "Stock split",
        impact: isDividend ? ("POSITIVE" as const) : ("NEUTRAL" as const),
        amount: isDividend ? e.amount : undefined,
        score: isDividend ? Math.round(clamp(60 + yieldPct * 5, 50, 90)) : 55,
      };
    });
}
