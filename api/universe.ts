import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleUniverse } from "../server/handlers";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const { status, body } = await handleUniverse();
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}
