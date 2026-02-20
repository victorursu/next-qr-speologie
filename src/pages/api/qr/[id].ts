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

  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid id" });
  }

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("speologieqr")
      .select(`
        *,
        cave:speologiepesteri(id, title)
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Not found" });
      }
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  if (req.method === "PUT") {
    const { slug, caves_id } = req.body;

    const updates: Record<string, string> = {};
    if (slug !== undefined) updates.slug = slug;
    if (caves_id !== undefined) updates.caves_id = caves_id;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const { data, error } = await supabase
      .from("speologieqr")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  if (req.method === "DELETE") {
    const { error } = await supabase
      .from("speologieqr")
      .delete()
      .eq("id", id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(204).end();
  }

  res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
