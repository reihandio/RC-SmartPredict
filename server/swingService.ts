/**
 * Swing candidate orchestration (Section 13c) — server-side pipeline:
 *  1. live quotes + daily history for the tracked universe
 *  2. technical prefilter (structure + measured R:R ≥ 2) — cheap, from bars
 *  3. Bandarmology: cache-first, bounded on-demand fill for missing tickers
 *  4. combine via the Section 13c formula (hard VA < 40 exclusion inside)
 *  5. fundamentals for the top candidates (warning layer only, not scored)
 */
import type { SwingCandidate } from "../src/types/index.js";
import { WATCHLIST } from "./watchlist.js";
import { getDailyHistory, getQuotes } from "./yahoo.js";
import { getCachedBrokerSummary, fillBrokerTickers } from "./broker/service.js";
import { getSwingFundamentals } from "./fundamentals.js";
import { buildSwingCandidate, technicalSetup } from "./swing.js";

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R | null>): Promise<R[]> {
  const out: Array<R | null> = new Array(items.length).fill(null);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        out[i] = await fn(items[i]);
      } catch {
        out[i] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out.filter((v): v is R => v !== null);
}

export async function getSwingCandidates(maxBrokerFill = 8): Promise<{
  candidates: SwingCandidate[];
  updatedAt: string;
}> {
  const quotes = await getQuotes(WATCHLIST);

  // step 1: technical prefilter (structure + measured R:R ≥ 2)
  const pre = await mapLimit(quotes, 6, async (q) => {
    const chart = await getDailyHistory(q.symbol, 80, false);
    if (chart.bars.length < 40) return null;
    const tech = technicalSetup(chart.bars);
    if (!tech || tech.riskReward < 2) return null;
    return { quote: q, bars: chart.bars, tech };
  });

  if (pre.length === 0) {
    return { candidates: [], updatedAt: new Date().toISOString() };
  }

  // step 2: broker summaries — cache first, bounded on-demand fill
  const missing: string[] = [];
  for (const p of pre) {
    const cached = await getCachedBrokerSummary(p.quote.symbol.replace(/\.JK$/i, "")).catch(() => null);
    if (!cached) missing.push(p.quote.symbol.replace(/\.JK$/i, ""));
  }
  if (missing.length > 0) {
    await fillBrokerTickers(missing.slice(0, maxBrokerFill), 2);
  }

  // step 3: combine (VA < 40 hard exclusion happens inside)
  const built: SwingCandidate[] = [];
  for (const p of pre) {
    const ticker = p.quote.symbol.replace(/\.JK$/i, "");
    const broker = await getCachedBrokerSummary(ticker).catch(() => null);
    if (!broker) continue; // no broker story → not a swing candidate (spec 13c)
    const c = buildSwingCandidate({
      quote: p.quote,
      bars: p.bars,
      broker: {
        score: broker.score,
        tier: broker.tier,
        reason: broker.tierReason,
        concentrationRisk: broker.concentrationRisk,
      },
      fundamentals: null,
    });
    if (c) built.push(c);
  }

  built.sort((a, b) => b.overallScore - a.overallScore);
  const top = built.slice(0, 15);

  // step 4: fundamentals for the shortlist (warning layer only)
  await mapLimit(top, 4, async (c) => {
    const f = await getSwingFundamentals(c.ticker);
    if (f) {
      const bits: string[] = [];
      if (f.epsTrend) bits.push(`EPS trend ${f.epsTrend.toLowerCase()}`);
      if (f.pbv !== undefined) bits.push(`PBV ${f.pbv}`);
      if (f.roe !== undefined) bits.push(`ROE ${f.roe}%`);
      if (f.der !== undefined) bits.push(`DER ${f.der}`);
      c.fundamentalNote =
        bits.length > 0
          ? `${bits.join("; ")}. No red flags from available free-source data.`
          : c.fundamentalNote;
    }
    return c;
  });

  return { candidates: top, updatedAt: new Date().toISOString() };
}
