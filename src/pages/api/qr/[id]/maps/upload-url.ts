import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthFromRequest } from "@/lib/auth";
import { getPresignedUploadUrl } from "@/lib/s3";
import { nanoid } from "nanoid";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!getAuthFromRequest(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid id" });
  }

  const bucket = process.env.AWS_S3_BUCKET?.trim();
  if (!bucket) {
    return res.status(503).json({
      error: "Map upload is not configured. Add AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY to .env.local, then restart the dev server.",
    });
  }

  const { filename, contentType } = req.body ?? {};
  if (!filename || typeof filename !== "string") {
    return res.status(400).json({ error: "filename is required" });
  }

  const ext = filename.split(".").pop()?.toLowerCase() || "png";
  const safeExt = ["png", "jpg", "jpeg", "gif", "webp"].includes(ext)
    ? ext
    : "png";
  const s3Key = `qr-assets/${id}/${nanoid(10)}.${safeExt}`;

  try {
    const uploadUrl = await getPresignedUploadUrl(
      s3Key,
      contentType || `image/${safeExt}`,
      300
    );
    return res.status(200).json({ uploadUrl, s3Key });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to create upload URL",
    });
  }
}
