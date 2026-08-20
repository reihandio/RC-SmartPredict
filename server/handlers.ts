/**
 * API handlers — framework-agnostic: return `{ status, body }` so the same
 * logic serves both Vercel functions (`api/*.ts`) and the vite dev proxy.
 */
import {
  getEvents,
  getMarketOverview,
  getPriceHistory,
  getScoredUniverse,
  getStockDetail,
} from "./universe.js";
import {
  getBrokerRadar,
  getBrokerSummary,
  refreshRadarSlice,
} from "./broker/service.js";

export interface HandlerResult {
  status: number;
  body: Record<string, unknown>;
}

const SERVER_ERROR = (err?: unknown): HandlerResult => {
  if (err) console.error("[api] handler error:", err);
  return {
    status: 502,
    body: { error: "Unable to retrieve market data. Please try again later." },
  };
};

export async function handleOverview(): Promise<HandlerResult> {
  try {
    return { status: 200, body: { overview: await getMarketOverview() } };
  } catch (err) {
    return SERVER_ERROR(err);
  }
}

export async function handleUniverse(): Promise<HandlerResult> {
  try {
    const { stocks, updatedAt } = await getScoredUniverse();
    return { status: 200, body: { stocks, updatedAt } };
  } catch (err) {
    return SERVER_ERROR(err);
  }
}

export async function handleStock(ticker: string): Promise<HandlerResult> {
  try {
    const result = await getStockDetail(ticker);
    if (!result) {
      return { status: 404, body: { error: "Data unavailable for this ticker." } };
    }
    return { status: 200, body: result };
  } catch (err) {
    return SERVER_ERROR(err);
  }
}

export async function handleHistory(ticker: string, range: string): Promise<HandlerResult> {
  try {
    const symbol = ticker.toUpperCase().endsWith(".JK") ? ticker.toUpperCase() : `${ticker.toUpperCase()}.JK`;
    const chart = await getPriceHistory(symbol, range);
    return {
      status: 200,
      body: { bars: chart.bars.map((b) => ({ time: b.time, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume })), updatedAt: chart.updatedAt },
    };
  } catch (err) {
    return SERVER_ERROR(err);
  }
}

export async function handleEvents(): Promise<HandlerResult> {
  try {
    const { actions, updatedAt } = await getEvents();
    return { status: 200, body: { actions, updatedAt } };
  } catch (err) {
    return SERVER_ERROR(err);
  }
}

// ── broker accumulation / Bandarmology (Section 13a) ─────────────────────

export async function handleBrokerSummary(ticker: string): Promise<HandlerResult> {
  try {
    const summary = await getBrokerSummary(ticker);
    if (!summary) {
      return {
        status: 404,
        body: { error: "Broker data unavailable for this ticker." },
      };
    }
    return { status: 200, body: { summary } };
  } catch (err) {
    return SERVER_ERROR(err);
  }
}

export async function handleBrokerRadar(): Promise<HandlerResult> {
  try {
    return { status: 200, body: await getBrokerRadar() };
  } catch (err) {
    return SERVER_ERROR(err);
  }
}

/**
 * Cron entry (Vercel Cron → /api/cron/broker-radar). Protected by
 * CRON_SECRET (Authorization: Bearer) on Vercel; in local dev the devApi
 * middleware calls it directly without a secret.
 */
export async function handleCronBrokerRadar(auth?: string): Promise<HandlerResult> {
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return { status: 401, body: { error: "Unauthorized." } };
  }
  try {
    const { refreshed } = await refreshRadarSlice();
    return {
      status: 200,
      body: { ok: true, refreshed, refreshedAt: new Date().toISOString() },
    };
  } catch (err) {
    return SERVER_ERROR(err);
  }
}
