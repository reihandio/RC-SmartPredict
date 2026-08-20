import type { VercelRequest, VercelResponse } from "@vercel/node";
import { waitUntil } from "@vercel/functions";
import { handleBrokerSummary } from "../../server/handlers.js";

// On-demand 3-window scrape takes ~3-8 s cold — allow up to the plan max.
export const maxDuration = 60;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ticker = Array.isArray(req.query.ticker) ? req.query.ticker[0] : (req.query.ticker ?? "");
  const { status, body, waitUntil: pendingRefresh } = await handleBrokerSummary(ticker);
  // SWR: stale data is served immediately; the background refresh started by
  // the service must survive past the response so the cache updates for the
  // next request (cron on the Hobby plan only runs once per day).
  if (pendingRefresh) waitUntil(pendingRefresh);
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}
