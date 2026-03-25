import { nanoid } from "nanoid";
import QRCode from "qrcode";
import Drawing from "dxf-writer";

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

/**
 * Returns the deeplink URL for cave QR codes: speologie://cave-qr/[uniquePart]
 * Extracts the unique part from slug (e.g. "speologie/qr/Rpmi9vr5j9" → "speologie://cave-qr/Rpmi9vr5j9")
 * Used for QR code generation (display, download, PDF)
 */
export function getQrCaveUrl(slug: string): string {
  const uniquePart = slug.split("/").pop() ?? slug;
  return `speologie://cave-qr/${uniquePart}`;
}

/**
 * SVG with only &lt;rect&gt; elements (no &lt;path&gt;), for laser engraving / CAM tools
 * that reject stroke-based QR output. White background + black module squares.
 */
export function qrToLaserEngraveSvgString(
  text: string,
  options: { margin?: number; outputSize?: number } = {}
): string {
  const margin = options.margin ?? 2;
  const outputSize = options.outputSize ?? 512;

  const qr = QRCode.create(text, { errorCorrectionLevel: "H" });
  const modSize = qr.modules.size;
  const data = qr.modules.data;
  const total = modSize + margin * 2;

  const rects: string[] = [];
  for (let row = 0; row < modSize; row++) {
    for (let col = 0; col < modSize; col++) {
      if (data[row * modSize + col]) {
        rects.push(
          `<rect x="${col + margin}" y="${row + margin}" width="1" height="1" fill="#000000"/>`
        );
      }
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${outputSize}" height="${outputSize}" ` +
    `viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">` +
    `<rect width="${total}" height="${total}" fill="#ffffff"/>` +
    rects.join("") +
    `</svg>\n`
  );
}

/**
 * DXF with one 3DFACE per dark module (millimeters, Y up).
 * Includes a white background face so AutoCAD shows black-on-white (not empty/black canvas).
 * Modules use true black; background uses true white. No logo — vector only.
 */
export function qrToDxfString(
  text: string,
  options: { margin?: number; mmPerModule?: number } = {}
): string {
  const margin = options.margin ?? 2;
  const mmPerModule = options.mmPerModule ?? 1;

  const qr = QRCode.create(text, { errorCorrectionLevel: "H" });
  const modSize = qr.modules.size;
  const data = qr.modules.data;
  const total = modSize + margin * 2;

  const d = new Drawing();
  d.setUnits("Millimeters");

  const w = total * mmPerModule;

  d.addLayer("QR_BG", Drawing.ACI.WHITE, "CONTINUOUS");
  d.setActiveLayer("QR_BG");
  d.setTrueColor(0xffffff);
  d.drawFace(0, 0, 0, 0, w, 0, w, w, 0, w, 0, 0);

  d.addLayer("QR_MOD", Drawing.ACI.WHITE, "CONTINUOUS");
  d.setActiveLayer("QR_MOD");
  d.setTrueColor(0x000000);

  for (let row = 0; row < modSize; row++) {
    for (let col = 0; col < modSize; col++) {
      if (data[row * modSize + col]) {
        const x1 = (col + margin) * mmPerModule;
        const y1 = (total - (row + margin + 1)) * mmPerModule;
        const x2 = (col + margin + 1) * mmPerModule;
        const y2 = (total - (row + margin)) * mmPerModule;
        d.drawFace(x1, y1, 0, x1, y2, 0, x2, y2, 0, x2, y1, 0);
      }
    }
  }

  return d.toDxfString();
}

