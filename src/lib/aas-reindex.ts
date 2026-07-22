/**
 * Orchestrates rebuilding an asset's cached AAS search text and mirroring
 * its AAS data to the local repository, from a single external fetch -
 * see `lib/aas-search-text.ts` and `lib/aas-mirror.ts` for what each half
 * actually does. Called from `lib/actions.ts` both when an asset with an
 * AAS reference is saved, and from the manual "Refresh search index"
 * action.
 */

import { getRawAasData, toAasData, type AasReference } from "@/lib/aas";
import { buildAasSearchText } from "@/lib/aas-search-text";
import { mirrorAasDataToLocalRepo, type MirrorStatus } from "@/lib/aas-mirror";

export type ReindexResult =
  | { status: "no-reference" }
  | { status: "failed" }
  | { status: "incomplete" }
  | { status: "ok"; text: string; mirror: MirrorStatus };

export async function reindexAssetAas(reference: AasReference): Promise<ReindexResult> {
  if (!reference.aasEndpointUrl && !reference.aasGlobalAssetId) {
    return { status: "no-reference" };
  }

  const raw = await getRawAasData(reference);
  if (!raw) {
    return { status: "failed" };
  }
  if (!raw.complete) {
    // A partial fetch (e.g. one submodel didn't come through) must not be
    // cached or mirrored as if it were the real thing - a once-incomplete
    // mirror copy would keep winning future resolutions over the real,
    // complete source.
    return { status: "incomplete" };
  }

  const text = buildAasSearchText(toAasData(raw));
  const mirror = await mirrorAasDataToLocalRepo(raw);
  return { status: "ok", text, mirror };
}
