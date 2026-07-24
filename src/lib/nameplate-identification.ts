/**
 * Tries to identify an asset's real product in a configured, external AAS
 * repository from a nameplate photo's OCR-extracted article number - see
 * `lib/nameplate-ocr-parse.ts` for how that guess is produced.
 *
 * Deliberately a small, explicit, per-manufacturer list (same spirit as
 * `KNOWN_SUBMODEL_TEMPLATES` in `lib/aas.ts`), not a generic algorithm:
 * different manufacturers' AAS repositories use different URL conventions
 * for a shell's `globalAssetId`, and guessing one we haven't actually
 * observed would be more likely to silently miss than to help. Only WAGO's
 * conventions are confirmed so far - **two** of them, both real, deliberately
 * both tried:
 * - `https://wago.com/ids/assets/{code}` (their shells' own
 *   `assetInformation.globalAssetId`) - genuinely ambiguous (could also
 *   coincidentally be a shell's own id), so resolved via `getAasData`'s
 *   `aasGlobalAssetId` kind, which races the `assetIds` filter search
 *   *and* a direct id lookup. The filter search is genuinely slow on
 *   WAGO's side - confirmed live and repeatedly, not a one-off blip: 15-23s
 *   for this exact query, article-number-independent.
 * - `https://wago.com/ids/aas/{code}` - the shell's own **id**, known for
 *   certain (this URL shape is never a real assetId) - resolved via
 *   `getAasData`'s `aasShellId` kind, which skips the slow `assetIds`
 *   search entirely and only does the fast direct lookup: confirmed live
 *   at ~0.2-0.9s for the same shell, every time. Using the ambiguous
 *   `aasGlobalAssetId` kind here too was tried first and does eventually
 *   resolve just as fast in isolation, but it also fires a pointless
 *   `assetIds` search on every repository - confirmed live to cause
 *   compounding connection contention (repeat calls climbed from ~0.8s to
 *   10s to 23s) since Promise.any never cancels the losing, still-running
 *   slow request. `aasShellId` avoids firing that request at all for a
 *   candidate we already know isn't a real assetId.
 *   Add another manufacturer's pattern(s) here once its own convention(s)
 *   are similarly confirmed.
 * - R. STAHL: `https://dt.r-stahl.com/aas/instance/{id}` - the shell's own
 *   id, resolved the same fast `aasShellId` way as WAGO's above. Only
 *   *partially* confirmed: a real physical nameplate's QR code does encode
 *   this exact URL for a specific unit (see `identifyAssetFromNameplateQrCode`
 *   below), but whether the same numeric id printed as plain OCR-readable
 *   text (unlabeled, under the nameplate's barcode) always matches is an
 *   open, deliberately low-risk bet - see `lib/nameplate-ocr-parse.ts`'s
 *   STAHL_INSTANCE_ID_PATTERN.
 *
 * Reuses `getAasData` (`lib/aas.ts`) as-is for the actual resolution - that
 * function already races a candidate across every configured repository
 * and has its own retry/timeout handling, so this only needs to build the
 * right candidate value(s) and reference kind to try. Since every candidate
 * here is raced together (see below), including the fast shell-id-kind
 * candidate lets it win the race instead of always waiting on the slow one.
 *
 * Also tries one OCR-error-tolerant variant of the article number (common
 * letter/digit confusions - "O"/"0", "I"/"l"/"1" - and stray whitespace),
 * alongside the raw guess, since OCR frequently gets exactly one character
 * of an otherwise-correct code wrong. All candidates (every repository x
 * every matching pattern x every variant) are raced together with a single
 * flat `Promise.any`, the same pattern `resolveShellByGlobalAssetId` in
 * `lib/aas.ts` uses and for the same reason: trying variants *sequentially*
 * would multiply the worst-case wait (already ~15s+ for a single slow
 * external repository) instead of just adding one more racer to the pool.
 */

import { prisma } from "@/lib/prisma";
import { getAasData, type AasData, type AasReference } from "@/lib/aas";

type ManufacturerAssetIdPattern = {
  matchesRepositoryName: (repositoryName: string) => boolean;
  /** Which `AasReference` field the candidate value belongs in - see the kind-specific notes above. */
  referenceKind: "aasGlobalAssetId" | "aasShellId";
  buildCandidateValue: (articleNumber: string) => string;
};

const MANUFACTURER_ASSET_ID_PATTERNS: ManufacturerAssetIdPattern[] = [
  {
    matchesRepositoryName: (repositoryName) => repositoryName.toLowerCase().includes("wago"),
    referenceKind: "aasGlobalAssetId",
    buildCandidateValue: (articleNumber) => `https://wago.com/ids/assets/${articleNumber}`,
  },
  {
    matchesRepositoryName: (repositoryName) => repositoryName.toLowerCase().includes("wago"),
    referenceKind: "aasShellId",
    buildCandidateValue: (articleNumber) => `https://wago.com/ids/aas/${articleNumber}`,
  },
  {
    // R. STAHL's own shell id, built from the instance id printed
    // (unlabeled, under the barcode) on the nameplate - see
    // `lib/nameplate-ocr-parse.ts`'s STAHL_INSTANCE_ID_PATTERN. Speculative:
    // confirmed live that a real, *QR-encoded* instance id resolves this
    // way, but not yet confirmed that the printed barcode number is always
    // the same value - a wrong guess just fails to resolve like any other
    // non-match, so this is a deliberately low-risk bet rather than a
    // confirmed pattern like WAGO's above.
    matchesRepositoryName: (repositoryName) => repositoryName.toLowerCase().includes("stahl"),
    referenceKind: "aasShellId",
    buildCandidateValue: (articleNumber) => `https://dt.r-stahl.com/aas/instance/${articleNumber}`,
  },
];

/** Corrects the OCR mix-ups seen live (letter/digit look-alikes, stray whitespace). */
function normalizeOcrConfusions(articleNumber: string): string {
  return articleNumber
    .replace(/\s+/g, "")
    .replace(/[oO]/g, "0")
    .replace(/[lI]/g, "1");
}

/** The raw guess first (most faithful to what was actually printed), then a corrected variant. */
function articleNumberVariants(articleNumber: string): string[] {
  const normalized = normalizeOcrConfusions(articleNumber);
  return normalized === articleNumber ? [articleNumber] : [articleNumber, normalized];
}

export type NameplateIdentificationMatch = {
  globalAssetId: string;
  aasData: AasData;
};

type Candidate = { value: string; reference: AasReference };

export async function identifyAssetFromNameplate(
  articleNumber: string | null
): Promise<NameplateIdentificationMatch | null> {
  if (!articleNumber) {
    return null;
  }

  const repositories = await prisma.aasRepository.findMany({
    where: { isLocalMirror: false },
  });
  const variants = articleNumberVariants(articleNumber);
  const candidates: Candidate[] = repositories.flatMap((repository) =>
    MANUFACTURER_ASSET_ID_PATTERNS.filter((pattern) =>
      pattern.matchesRepositoryName(repository.name)
    ).flatMap((pattern) =>
      variants.map((variant) => {
        const value = pattern.buildCandidateValue(variant);
        return { value, reference: { [pattern.referenceKind]: value } };
      })
    )
  );

  const attempts = candidates.map(async ({ value, reference }) => {
    const aasData = await getAasData(reference);
    if (!aasData) {
      throw new Error(`no match for ${value}`);
    }
    return { globalAssetId: value, aasData };
  });

  try {
    return await Promise.any(attempts);
  } catch {
    return null;
  }
}

/**
 * A QR code printed on a nameplate can link directly to that specific
 * unit's digital twin - confirmed live against a real physical R. STAHL
 * nameplate: `https://dt.r-stahl.com/{locale}/{instanceId}/{typeCode}`,
 * where `instanceId` is the same numeric id as the shell's own id
 * (`https://dt.r-stahl.com/aas/instance/{instanceId}`). This is a far more
 * precise signal than OCR-guessing an article number, since it's already
 * unit-specific rather than a generic product-type code - so it's tried as
 * its own, separate identification path (see `lib/nameplate-qr.ts` for the
 * decoding step), not folded into `identifyAssetFromNameplate` above.
 *
 * Confirmed live: not every nameplate has one (an older R. STAHL unit
 * without a QR code, and without any digital twin registered at all, was
 * checked directly against the real API and genuinely doesn't resolve) -
 * this is expected to return null for those, same as any other non-match.
 */
type ManufacturerQrUrlPattern = {
  matchesRepositoryName: (repositoryName: string) => boolean;
  urlPattern: RegExp;
  buildShellId: (match: RegExpMatchArray) => string;
};

const MANUFACTURER_QR_URL_PATTERNS: ManufacturerQrUrlPattern[] = [
  {
    matchesRepositoryName: (repositoryName) => repositoryName.toLowerCase().includes("stahl"),
    urlPattern: /^https:\/\/dt\.r-stahl\.com\/[a-zA-Z]{2}-[a-zA-Z]{2}\/(\d+)\/[^/]+\/?$/,
    buildShellId: (match) => `https://dt.r-stahl.com/aas/instance/${match[1]}`,
  },
];

export async function identifyAssetFromNameplateQrCode(
  qrText: string | null
): Promise<NameplateIdentificationMatch | null> {
  if (!qrText) {
    return null;
  }

  const repositories = await prisma.aasRepository.findMany({
    where: { isLocalMirror: false },
  });

  for (const pattern of MANUFACTURER_QR_URL_PATTERNS) {
    const match = qrText.match(pattern.urlPattern);
    if (!match || !repositories.some((repository) => pattern.matchesRepositoryName(repository.name))) {
      continue;
    }
    const shellId = pattern.buildShellId(match);
    const aasData = await getAasData({ aasShellId: shellId });
    if (aasData) {
      return { globalAssetId: shellId, aasData };
    }
  }

  return null;
}
