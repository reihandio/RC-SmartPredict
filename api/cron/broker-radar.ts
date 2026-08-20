import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCronBrokerRadar } from "../../server/handlers.js";

// Batch precompute can run 10-30 s — allow up to the plan max.
export const maxDuration = 60;

/**
 * Vercel Cron endpoint — precomputes Bandarmology summaries in rotating
 * batches (see vercel.json `crons`). Protected by CRON_SECRET on Vercel.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : (req.headers.authorization ?? undefined);
  const { status, body } = await handleCronBrokerRadar(auth);
  res.status(status).json(body);
}
