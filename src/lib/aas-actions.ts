"use server";

import { getAasData } from "@/lib/aas";
import type { AasReference } from "@/lib/aas";
import { lookupCoordinatesForAddress } from "@/lib/timezone";

export type AasCheckResult =
  | { status: "resolved"; idShort: string }
  | { status: "unresolved" };

export async function checkAasReference(
  reference: AasReference
): Promise<AasCheckResult> {
  const data = await getAasData(reference);
  if (!data) {
    return { status: "unresolved" };
  }
  return { status: "resolved", idShort: data.idShort || data.id };
}

export async function lookupNameplateCoordinates(
  address: string
): Promise<{ lat: number; lon: number } | null> {
  return lookupCoordinatesForAddress(address);
}
