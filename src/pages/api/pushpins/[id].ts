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

  if (req.method !== "PATCH") {
    res.setHeader("Allow", ["PATCH"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { name, html } = req.body ?? {};

  const updates: Record<string, string> = {};
  if (name !== undefined) updates.name = name;
  if (html !== undefined) updates.html = html;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  const { data, error } = await supabase
    .from("speologieqrmappushpin")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return res.status(404).json({ error: "Pushpin not found" });
    }
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
}
