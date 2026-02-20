import { nanoid } from "nanoid";

const QR_BASE_URL = "https://www.speologie.org/qr";

/**
 * Generates a unique slug in format: speologie/qr/[uniqueId]
 */
export function generateSlug(): string {
  const uniqueId = nanoid(10);
  return `speologie/qr/${uniqueId}`;
}

/**
 * Returns the full URL encoded in the QR code: https://www.speologie.org/qr/[slug]
 * Extracts the unique part from slug (e.g. "speologie/qr/abc123" → "abc123")
 */
export function getQrRedirectUrl(slug: string): string {
  const uniquePart = slug.split("/").pop() ?? slug;
  return `${QR_BASE_URL}/${uniquePart}`;
}
