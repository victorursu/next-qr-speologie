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

  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid id" });
  }

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("speologieqrmap")
      .select(
        `
        *,
        pushpins:speologieqrmappushpin(*)
      `
      )
      .eq("qr_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const maps = (data ?? []).map((m: { s3_key: string }) => ({
      ...m,
      url: getS3PublicUrl(m.s3_key),
    }));
    return res.status(200).json(maps);
  }

  if (req.method === "POST") {
    const { s3Key, filename } = req.body ?? {};
    if (!s3Key || typeof s3Key !== "string") {
      return res.status(400).json({ error: "s3Key is required" });
    }

    const { data, error } = await supabase
      .from("speologieqrmap")
      .insert({ qr_id: id, s3_key: s3Key, filename: filename || null })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json(data);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
