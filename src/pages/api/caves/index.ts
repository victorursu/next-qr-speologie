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

  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

  if (!q || q.length < 2) {
    return res.status(200).json([]);
  }

  // Try RPC first (diacritic-insensitive via unaccent)
  const { data: rpcData, error: rpcError } = await supabase.rpc("search_caves", {
    query_text: q,
  });

  if (!rpcError) {
    return res.status(200).json(rpcData ?? []);
  }

  // Fallback: direct query if RPC doesn't exist or fails
  const { data, error } = await supabase
    .from("speologiepesteri")
    .select("id, title")
    .ilike("title", `%${q}%`)
    .order("title")
    .limit(20);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data ?? []);
}
