/**
 * Decodes a QR code from a nameplate photo, if one is visible - some
 * manufacturers (confirmed live: R. STAHL, on a real physical nameplate)
 * print a QR code that links directly to that specific unit's digital twin,
 * which is a far more precise identification signal than OCR-guessing an
 * article number ever could be (see `lib/nameplate-identification.ts` for
 * the QR-URL-to-shell matching that consumes this).
 */

import sharp from "sharp";
import jsQR from "jsqr";

export async function decodeNameplateQrCode(imageBuffer: Buffer): Promise<string | null> {
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const result = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  return result?.data ?? null;
}
