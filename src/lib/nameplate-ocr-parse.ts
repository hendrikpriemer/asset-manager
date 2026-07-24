/**
 * Best-effort, pure-function interpretation of a nameplate photo's raw OCR
 * text (see `lib/nameplate-ocr.ts`) into a manufacturer name and article/
 * item number - the two things needed to try identifying the real product
 * in a configured AAS repository (`lib/nameplate-identification.ts`).
 *
 * Deliberately does not try to recognize a manufacturer name generically -
 * only checks whether the OCR text mentions one of the manufacturer names
 * we actually have a configured `AasRepository` for (passed in by the
 * caller), since there's nothing useful to do with a manufacturer we don't
 * have a repository for anyway.
 */

export type NameplateOcrGuess = {
  manufacturerName: string | null;
  articleNumber: string | null;
  rawText: string;
};

// Tried in order, first label match wins. Covers the label actually seen on
// a real WAGO nameplate photo ("ITEM-NO.") plus common English/German
// equivalents used on other manufacturers' nameplates.
const ARTICLE_NUMBER_LABEL_PATTERNS: RegExp[] = [
  /item[\s-]?no\.?\s*[:.]?\s*([A-Za-z0-9][\w./-]*)/i,
  /art(?:ikel)?\.?-?\s*nr\.?\s*[:.]?\s*([A-Za-z0-9][\w./-]*)/i,
  /bestell-?\s*nr\.?\s*[:.]?\s*([A-Za-z0-9][\w./-]*)/i,
  /order[\s-]?no\.?\s*[:.]?\s*([A-Za-z0-9][\w./-]*)/i,
  /type\s*[:.]?\s*([A-Za-z0-9][\w./-]*)/i,
];

// Falls back to a bare dash-separated number (matches WAGO's own article
// number convention, e.g. "750-451", "2000-2228") when no labeled pattern
// is found - OCR noise often drops or garbles the label text itself.
const FALLBACK_ARTICLE_NUMBER_PATTERN = /\b\d{2,4}-\d{2,6}\b/;

// R. STAHL's digital-twin instance id (tried via `lib/nameplate-
// identification.ts`'s MANUFACTURER_ASSET_ID_PATTERNS) - confirmed live: an
// 11-digit id starting with "1000", printed unlabeled under the nameplate's
// barcode (not yet confirmed this printed number always matches a real,
// resolvable shell - only the format is confirmed, resolution is a genuine
// attempt either way). Tried *before* the labeled patterns and the dash
// fallback: a real STAHL plate's own "Order no." label would otherwise win
// with an unrelated value, and its type-code (e.g. "8570/11-306-S-01-0-00-
// XXX") would otherwise false-positive-match the dash fallback's "11-306".
const STAHL_INSTANCE_ID_PATTERN = /\b1000\d{7}\b/;

function extractArticleNumber(rawText: string): string | null {
  const stahlInstanceId = rawText.match(STAHL_INSTANCE_ID_PATTERN)?.[0];
  if (stahlInstanceId) {
    return stahlInstanceId;
  }

  for (const pattern of ARTICLE_NUMBER_LABEL_PATTERNS) {
    const match = rawText.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return rawText.match(FALLBACK_ARTICLE_NUMBER_PATTERN)?.[0] ?? null;
}

function extractManufacturerName(
  rawText: string,
  knownManufacturerNames: string[]
): string | null {
  const normalized = rawText.toLowerCase();
  return (
    knownManufacturerNames.find((name) => normalized.includes(name.toLowerCase())) ?? null
  );
}

export function parseNameplateOcrText(
  rawText: string,
  knownManufacturerNames: string[]
): NameplateOcrGuess {
  return {
    manufacturerName: extractManufacturerName(rawText, knownManufacturerNames),
    articleNumber: extractArticleNumber(rawText),
    rawText,
  };
}
