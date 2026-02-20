import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";
import { getAuthFromRequest } from "@/lib/auth";
import { nanoid } from "nanoid";

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

  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { pushpins } = req.body ?? {};
  if (!Array.isArray(pushpins)) {
    return res.status(400).json({ error: "pushpins array is required" });
  }

  const { data: existing } = await supabase
    .from("speologieqrmappushpin")
    .delete()
    .eq("map_id", mapId);

  if (pushpins.length === 0) {
    return res.status(200).json([]);
  }

  const rows = pushpins.map(
    (p: { identifier?: string; x: number; y: number; name: string }) => ({
      map_id: mapId,
      identifier: p.identifier ?? nanoid(10),
      x: Number(p.x),
      y: Number(p.y),
      name: p.name ?? "",
    })
  );

  const { data, error } = await supabase
    .from("speologieqrmappushpin")
    .insert(rows)
    .select();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data ?? []);
}
