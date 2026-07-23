/**
 * Runs OCR (`tesseract.js`) over a nameplate photo's raw bytes, returning the
 * recognized raw text for `lib/nameplate-ocr-parse.ts` to interpret.
 *
 * Preprocessing (downscale, grayscale, contrast normalization via `sharp`)
 * plus `PSM.SPARSE_TEXT` (nameplates are scattered labels among graphics and
 * wiring diagrams, not a page of prose) were both confirmed live to matter a
 * lot: a real, well-lit phone photo of a WAGO nameplate went from unreadable
 * noise to correctly reading its "ITEM-NO." and address once both were
 * applied. A professional, angled studio product photo of a different WAGO
 * part still failed to produce anything useful even with this preprocessing
 * - a known, accepted limitation of classic OCR (vs. a vision model) for
 * off-axis/reflective photos, not something worth chasing further here.
 *
 * `workerPath` must be passed explicitly: tesseract.js's own default (Node)
 * computes it via `path.join(__dirname, ...)` relative to its own installed
 * location, which breaks once this file is bundled by Next.js/Turbopack
 * (`__dirname` no longer points at the real `node_modules/tesseract.js`
 * location) - confirmed live, this throws "Cannot find module .../tesseract.js/
 * src/worker-script/node/index.js" when actually run through the dev server,
 * despite working fine in a plain Node script and in Vitest (neither goes
 * through Turbopack's bundling). `process.cwd()` reliably points at the real
 * app root regardless of bundling, unlike `__dirname`.
 */

import { createWorker, PSM } from "tesseract.js";
import sharp from "sharp";
import path from "node:path";

const OCR_LANGUAGE = "eng";
const MAX_WIDTH_PX = 1500;
// A real, low-resolution (680px-wide) nameplate photo, left at its native
// size (no resize - it was already under MAX_WIDTH_PX) but still put through
// grayscale+normalize, came back with completely empty OCR text - worse
// than doing no preprocessing at all on the same photo. Upscaling it to a
// minimum width first (confirmed live) avoids that empty-result failure
// mode, even though OCR accuracy on small/low-quality photos remains
// inherently unreliable - a known, accepted limitation of classic OCR.
const MIN_WIDTH_PX = 1200;
const WORKER_SCRIPT_PATH = path.join(
  process.cwd(),
  "node_modules/tesseract.js/src/worker-script/node/index.js"
);

async function preprocessForOcr(imageBuffer: Buffer): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const width = metadata.width
    ? Math.min(Math.max(metadata.width, MIN_WIDTH_PX), MAX_WIDTH_PX)
    : undefined;
  return image
    .resize(width ? { width } : undefined)
    .grayscale()
    .normalize()
    .toBuffer();
}

export async function recognizeNameplateText(imageBuffer: Buffer): Promise<string> {
  const preprocessed = await preprocessForOcr(imageBuffer);
  const worker = await createWorker(OCR_LANGUAGE, undefined, {
    workerPath: WORKER_SCRIPT_PATH,
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const { data } = await worker.recognize(preprocessed);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
