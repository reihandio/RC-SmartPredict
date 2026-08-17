import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleStock } from "../../server/handlers.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ticker = Array.isArray(req.query.ticker) ? req.query.ticker[0] : (req.query.ticker ?? "");
  const { status, body } = await handleStock(ticker);
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}
