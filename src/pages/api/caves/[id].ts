import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";
import { getAuthFromRequest } from "@/lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!getAuthFromRequest(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid id" });
  }
  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const { data, error } = await supabase
    .from("speologiepesteri")
    .select("id, title")
    .eq("id", idNum)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return res.status(404).json({ error: "Cave not found" });
    }
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
}
