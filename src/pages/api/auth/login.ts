import type { NextApiRequest, NextApiResponse } from "next";
import { verifyPassword, setAuthCookie } from "@/lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { password } = req.body ?? {};

  if (!password || typeof password !== "string") {
    return res.status(400).json({ error: "Password is required" });
  }

  if (!verifyPassword(password)) {
    return res.status(401).json({ error: "Invalid password" });
  }

  setAuthCookie(res);
  return res.status(200).json({ success: true });
}
