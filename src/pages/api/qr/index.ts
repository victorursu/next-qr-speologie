import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";
import { generateSlug } from "@/lib/qr";
import { getAuthFromRequest } from "@/lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!getAuthFromRequest(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    let query = supabase
      .from("speologieqr")
      .select(`
        *,
        cave:speologiepesteri(id, title)
      `)
      .order("created_at", { ascending: false });

    const caveId = req.query.cave;
    if (typeof caveId === "string" && caveId) {
      query = query.eq("caves_id", caveId);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  if (req.method === "POST") {
    const { caves_id } = req.body;

    if (!caves_id) {
      return res.status(400).json({ error: "caves_id is required" });
    }

    const slug = generateSlug();

    const { data, error } = await supabase
      .from("speologieqr")
      .insert({ slug, caves_id })
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
