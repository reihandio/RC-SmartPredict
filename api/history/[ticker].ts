import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleHistory } from "../../server/handlers";

const VALID_RANGES = ["1D", "1W", "1M", "3M", "6M", "1Y"];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ticker = Array.isArray(req.query.ticker) ? req.query.ticker[0] : (req.query.ticker ?? "");
  const rangeParam = Array.isArray(req.query.range) ? req.query.range[0] : (req.query.range ?? "6M");
  const range = VALID_RANGES.includes(rangeParam) ? rangeParam : "6M";
  const { status, body } = await handleHistory(ticker, range);
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}
