import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleBrokerRadar } from "../server/handlers.js";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const { status, body } = await handleBrokerRadar();
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}
