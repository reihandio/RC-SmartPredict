import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleSwingCandidates } from "../server/handlers.js";

// The swing pipeline scans the tracked universe (quotes + history + bounded
// broker fill) on demand — allow up to the plan maximum.
export const maxDuration = 60;

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const { status, body } = await handleSwingCandidates();
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}
