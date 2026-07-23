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
 * convention is confirmed so far (`https://wago.com/ids/assets/{code}`,
 * verified live against two real nameplate photos' own article numbers,
 * both of which resolved to real shells in WAGO's repository) - add another
 * manufacturer's pattern here once its convention is similarly confirmed.
 *
 * Reuses `getAasData` (`lib/aas.ts`) as-is for the actual resolution - that
 * function already races a candidate globalAssetId across every configured
 * repository and has its own retry/timeout handling, so this only needs to
 * build the right candidate URL(s) to try.
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
import { getAasData, type AasData } from "@/lib/aas";

type ManufacturerAssetIdPattern = {
  matchesRepositoryName: (repositoryName: string) => boolean;
  buildCandidateGlobalAssetId: (articleNumber: string) => string;
};

const MANUFACTURER_ASSET_ID_PATTERNS: ManufacturerAssetIdPattern[] = [
  {
    matchesRepositoryName: (repositoryName) => repositoryName.toLowerCase().includes("wago"),
    buildCandidateGlobalAssetId: (articleNumber) => `https://wago.com/ids/assets/${articleNumber}`,
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
  const candidateGlobalAssetIds = repositories.flatMap((repository) =>
    MANUFACTURER_ASSET_ID_PATTERNS.filter((pattern) =>
      pattern.matchesRepositoryName(repository.name)
    ).flatMap((pattern) => variants.map((variant) => pattern.buildCandidateGlobalAssetId(variant)))
  );

  const attempts = candidateGlobalAssetIds.map(async (globalAssetId) => {
    const aasData = await getAasData({ aasGlobalAssetId: globalAssetId });
    if (!aasData) {
      throw new Error(`no match for ${globalAssetId}`);
    }
    return { globalAssetId, aasData };
  });

  try {
    return await Promise.any(attempts);
  } catch {
    return null;
  }
}
