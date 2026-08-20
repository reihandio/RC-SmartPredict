import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleBrokerRadar } from "../server/handlers.js";

// Cold paths can run 10-30 s (bounded on-demand broker scrapes) — allow up to the plan max.
export const maxDuration = 60;

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const { status, body } = await handleBrokerRadar();
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}
