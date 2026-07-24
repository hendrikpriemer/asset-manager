"use server";

import { getAasData } from "@/lib/aas";
import type { AasReference } from "@/lib/aas";
import { identifyAssetFromNameplate } from "@/lib/nameplate-identification";
import { lookupCoordinatesForAddress } from "@/lib/timezone";

export type AasCheckResult =
  | { status: "resolved"; idShort: string; matchedGlobalAssetId: string | null }
  | { status: "unresolved" };

/**
 * Resolves an AAS reference a customer entered by hand. Tries it directly
 * first (an already-correct endpoint URL or globalAssetId); if that fails
 * and no endpoint URL was given, falls back to searching every configured
 * repository for a manufacturer material/serial number match - the exact
 * same search nameplate-photo identification uses (`lib/nameplate-
 * identification.ts`), since a customer typing a bare code here means the
 * same thing as an OCR'd one: "find the real product this identifies," not
 * "this literal string is already a valid reference."
 */
export async function resolveAasReference(
  reference: AasReference,
  rawValue: string
): Promise<{ reference: AasReference; idShort: string; matchedGlobalAssetId: string | null } | null> {
  const direct = await getAasData(reference);
  if (direct) {
    return { reference, idShort: direct.idShort || direct.id, matchedGlobalAssetId: null };
  }
  if (reference.aasEndpointUrl) {
    return null;
  }

  const match = await identifyAssetFromNameplate(rawValue);
  if (!match) {
    return null;
  }
  return {
    reference: { aasEndpointUrl: null, aasGlobalAssetId: match.globalAssetId },
    idShort: match.aasData.idShort || match.aasData.id,
    matchedGlobalAssetId: match.globalAssetId,
  };
}

export async function checkAasReference(
  reference: AasReference,
  rawValue: string
): Promise<AasCheckResult> {
  const resolved = await resolveAasReference(reference, rawValue);
  if (!resolved) {
    return { status: "unresolved" };
  }
  return {
    status: "resolved",
    idShort: resolved.idShort,
    matchedGlobalAssetId: resolved.matchedGlobalAssetId,
  };
}

export async function lookupNameplateCoordinates(
  address: string
): Promise<{ lat: number; lon: number } | null> {
  return lookupCoordinatesForAddress(address);
}
