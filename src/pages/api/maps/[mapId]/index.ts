import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";
import { getAuthFromRequest } from "@/lib/auth";
import { getS3PublicUrl } from "@/lib/s3";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!getAuthFromRequest(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { mapId } = req.query;
  if (typeof mapId !== "string") {
    return res.status(400).json({ error: "Invalid mapId" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { data, error } = await supabase
    .from("speologieqrmap")
    .select(
      `
      *,
      pushpins:speologieqrmappushpin(*)
    `
    )
    .eq("id", mapId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return res.status(404).json({ error: "Map not found" });
    }
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({
    ...data,
    url: getS3PublicUrl(data.s3_key),
  });
}
