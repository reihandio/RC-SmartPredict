import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleBrokerSummary } from "../../server/handlers.js";

// On-demand 3-window scrape takes ~3-8 s cold — allow up to the plan max.
export const maxDuration = 60;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ticker = Array.isArray(req.query.ticker) ? req.query.ticker[0] : (req.query.ticker ?? "");
  const { status, body } = await handleBrokerSummary(ticker);
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}
