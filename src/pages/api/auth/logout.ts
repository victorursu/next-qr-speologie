import type { NextApiRequest, NextApiResponse } from "next";
import { clearAuthCookie } from "@/lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  clearAuthCookie(res);
  return res.status(200).json({ success: true });
}
