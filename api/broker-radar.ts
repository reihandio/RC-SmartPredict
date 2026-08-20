import type { VercelRequest, VercelResponse } from "@vercel/node";
import { waitUntil } from "@vercel/functions";
import { handleBrokerRadar } from "../server/handlers.js";

// Cold paths can run 10-30 s (bounded on-demand broker scrapes) — allow up to the plan max.
export const maxDuration = 60;

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const { status, body, waitUntil: pendingRefresh } = await handleBrokerRadar();
  // SWR: bounded background refreshes for stale radar entries must survive
  // past the response (cron on the Hobby plan only runs once per day).
  if (pendingRefresh) waitUntil(pendingRefresh);
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}
