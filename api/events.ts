import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleEvents } from "../server/handlers";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const { status, body } = await handleEvents();
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}
