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
